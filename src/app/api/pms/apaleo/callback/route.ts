import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApaleoClient } from "@/lib/pms/apaleo-client";
import { encryptApaleoSecret } from "@/lib/pms/apaleo-crypto";
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

  if (!connection?.apaleoClientId || !connection.apaleoClientSecret) {
    return NextResponse.json(
      { error: "Apaleo connection is missing client credentials." },
      { status: 400 }
    );
  }

  const redirectUri = process.env.APALEO_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json(
      { error: "APALEO_REDIRECT_URI is not configured." },
      { status: 500 }
    );
  }

  const client = new ApaleoClient({
    apiBaseUrl: connection.apaleoApiBaseUrl,
    identityBaseUrl: connection.apaleoIdentityBaseUrl,
    clientId: connection.apaleoClientId,
    clientSecret: connection.apaleoClientSecret,
    redirectUri,
  });

  const tokenResponse = await client.exchangeCodeForTokens(code);
  const accessPayload = decodeJwtPayload(tokenResponse.access_token);
  const accountCode =
    connection.apaleoAccountCode ||
    (typeof accessPayload?.account_code === "string" ? accessPayload.account_code : null) ||
    (typeof accessPayload?.accountCode === "string" ? accessPayload.accountCode : null);

  await db.pmsConnection.update({
    where: { id: connection.id },
    data: {
      enabled: true,
      apaleoAccountCode: accountCode,
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
