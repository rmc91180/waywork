import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getApaleoRuntimeConfig, resolveApaleoValue } from "@/lib/pms/apaleo-config";
import { buildApaleoAuthorizationUrl, createApaleoOAuthState } from "@/lib/pms/apaleo-oauth";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

export async function GET(request: Request) {
  if (!isApaleoProviderActive()) {
    return NextResponse.json(
      { error: "Apaleo provider is not active in this environment." },
      { status: 409 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await db.pmsConnection.findFirst({
    where: {
      userId: session.user.id,
      provider: "APALEO",
    },
    select: {
      apaleoIdentityBaseUrl: true,
      apaleoClientId: true,
    },
  });
  const apaleoRuntime = getApaleoRuntimeConfig();
  const clientId = resolveApaleoValue(connection?.apaleoClientId ?? undefined, apaleoRuntime.clientId);
  const identityBaseUrl = connection?.apaleoIdentityBaseUrl || apaleoRuntime.identityBaseUrl;

  if (!clientId) {
    return NextResponse.json(
      { error: "Configure apaleo client credentials before starting OAuth." },
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

  const requestUrl = new URL(request.url);
  const state = createApaleoOAuthState({
    userId: session.user.id,
    returnTo: requestUrl.searchParams.get("returnTo") || "/host",
  });

  const authorizationUrl = buildApaleoAuthorizationUrl({
    identityBaseUrl,
    clientId,
    redirectUri,
    state,
  });

  return NextResponse.redirect(authorizationUrl);
}
