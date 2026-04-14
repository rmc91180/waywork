import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApaleoClient } from "@/lib/pms/apaleo-client";
import { encryptApaleoSecret } from "@/lib/pms/apaleo-crypto";
import { getApaleoRuntimeConfig, resolveApaleoValue } from "@/lib/pms/apaleo-config";
import { parseApaleoOAuthState } from "@/lib/pms/apaleo-oauth";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!isApaleoProviderActive()) {
    return NextResponse.json(
      { error: "Apaleo provider is not active in this environment." },
      { status: 409 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/host?apaleo=error&reason=${encodeURIComponent(error)}`, url));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing apaleo OAuth code or state." }, { status: 400 });
  }

  const parsedState = parseApaleoOAuthState(state);
  const apaleoRuntime = getApaleoRuntimeConfig();

  const connection = await db.pmsConnection.findFirst({
    where: {
      userId: parsedState.userId,
      provider: "APALEO",
    },
    select: {
      id: true,
      apaleoApiBaseUrl: true,
      apaleoIdentityBaseUrl: true,
      apaleoClientId: true,
      apaleoClientSecret: true,
      apaleoAccountCode: true,
    },
  });

  const clientId = resolveApaleoValue(connection?.apaleoClientId ?? undefined, apaleoRuntime.clientId);
  const clientSecret = resolveApaleoValue(
    connection?.apaleoClientSecret ?? undefined,
    apaleoRuntime.clientSecret
  );
  const apiBaseUrl = connection?.apaleoApiBaseUrl || apaleoRuntime.apiBaseUrl;
  const identityBaseUrl = connection?.apaleoIdentityBaseUrl || apaleoRuntime.identityBaseUrl;
  const accountCode =
    connection?.apaleoAccountCode || apaleoRuntime.accountCode || "LIMEHOME-MADRID";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Apaleo connection is missing client credentials." },
      { status: 400 }
    );
  }

  const redirectUri = apaleoRuntime.redirectUri;
  if (!redirectUri) {
    return NextResponse.json(
      { error: "APALEO_REDIRECT_URI is not configured." },
      { status: 500 }
    );
  }

  const ensuredConnection =
    connection ||
    (await db.pmsConnection.upsert({
      where: {
        userId_provider: {
          userId: parsedState.userId,
          provider: "APALEO",
        },
      },
      create: {
        userId: parsedState.userId,
        provider: "APALEO",
        enabled: false,
        apaleoApiBaseUrl: apiBaseUrl,
        apaleoIdentityBaseUrl: identityBaseUrl,
        apaleoClientId: clientId,
        apaleoClientSecret: clientSecret,
        apaleoAccountCode: accountCode,
        apaleoWebhookSecret: apaleoRuntime.webhookSecret,
      },
      update: {
        apaleoApiBaseUrl: apiBaseUrl,
        apaleoIdentityBaseUrl: identityBaseUrl,
        apaleoClientId: clientId,
        apaleoClientSecret: clientSecret,
        apaleoAccountCode: accountCode,
        apaleoWebhookSecret: apaleoRuntime.webhookSecret || undefined,
      },
      select: {
        id: true,
        apaleoApiBaseUrl: true,
        apaleoIdentityBaseUrl: true,
        apaleoClientId: true,
        apaleoClientSecret: true,
        apaleoAccountCode: true,
      },
    }));

  const client = new ApaleoClient({
    apiBaseUrl,
    identityBaseUrl,
    clientId,
    clientSecret,
    redirectUri,
  });

  const tokenResponse = await client.exchangeCodeForTokens(code);
  const accessPayload = decodeJwtPayload(tokenResponse.access_token);
  const resolvedAccountCode =
    ensuredConnection.apaleoAccountCode ||
    (typeof accessPayload?.account_code === "string" ? accessPayload.account_code : null) ||
    (typeof accessPayload?.accountCode === "string" ? accessPayload.accountCode : null);

  await db.pmsConnection.update({
    where: { id: ensuredConnection.id },
    data: {
      enabled: true,
      apaleoApiBaseUrl: apiBaseUrl,
      apaleoIdentityBaseUrl: identityBaseUrl,
      apaleoClientId: clientId,
      apaleoClientSecret: clientSecret,
      apaleoAccountCode: resolvedAccountCode,
      apaleoRefreshToken: tokenResponse.refresh_token
        ? encryptApaleoSecret(tokenResponse.refresh_token)
        : undefined,
      apaleoAccessTokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      apaleoConnectedAt: new Date(),
      apaleoLastTokenRefreshAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL(parsedState.returnTo || "/host", url));
}
