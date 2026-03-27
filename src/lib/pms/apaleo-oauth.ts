import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_CONNECT_SCOPES = [
  "offline_access",
  "identity:account-users.read",
  "reservations.read",
  "reservations.manage",
  "availability.read",
  "rates.read",
  "setup.read",
];

export interface ApaleoOAuthStatePayload {
  userId: string;
  issuedAt: number;
  returnTo?: string;
}

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign apaleo OAuth state.");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createApaleoOAuthState(payload: Omit<ApaleoOAuthStatePayload, "issuedAt">) {
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, issuedAt: Date.now() }),
    "utf8"
  ).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseApaleoOAuthState(state: string, maxAgeMs = 15 * 60_000) {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid apaleo OAuth state.");
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Apaleo OAuth state signature is invalid.");
  }

  const parsed = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as ApaleoOAuthStatePayload;

  if (!parsed.userId || !parsed.issuedAt) {
    throw new Error("Apaleo OAuth state payload is incomplete.");
  }

  if (Date.now() - parsed.issuedAt > maxAgeMs) {
    throw new Error("Apaleo OAuth state has expired.");
  }

  return parsed;
}

export function getDefaultApaleoOauthScopes() {
  return DEFAULT_CONNECT_SCOPES.join(" ");
}

export function buildApaleoAuthorizationUrl(input: {
  identityBaseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}) {
  const url = new URL("/connect/authorize", input.identityBaseUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.scope || getDefaultApaleoOauthScopes());
  url.searchParams.set("state", input.state);

  return url.toString();
}
