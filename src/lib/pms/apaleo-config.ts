export interface ApaleoRuntimeConfig {
  apiBaseUrl: string;
  identityBaseUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  accountCode: string | null;
  webhookSecret: string | null;
  redirectUri: string | null;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getApaleoRuntimeConfig(): ApaleoRuntimeConfig {
  return {
    apiBaseUrl: clean(process.env.APALEO_API_BASE_URL) || "https://api.apaleo.com",
    identityBaseUrl: clean(process.env.APALEO_IDENTITY_BASE_URL) || "https://identity.apaleo.com",
    clientId: clean(process.env.APALEO_CLIENT_ID),
    clientSecret: clean(process.env.APALEO_CLIENT_SECRET),
    accountCode: clean(process.env.APALEO_ACCOUNT_CODE),
    webhookSecret: clean(process.env.APALEO_WEBHOOK_SECRET),
    redirectUri: clean(process.env.APALEO_REDIRECT_URI),
  };
}

export function resolveApaleoValue(
  value: string | undefined,
  fallback: string | null | undefined
) {
  const explicit = clean(value);
  if (explicit) return explicit;
  return clean(fallback || undefined);
}
