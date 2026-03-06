export type PmsProviderMode = "NONE" | "MEWS" | "SITEMINDER";

const DEFAULT_PROVIDER_MODE: PmsProviderMode = "SITEMINDER";

function normalizeMode(rawValue: string | undefined): PmsProviderMode {
  const value = (rawValue || "").trim().toUpperCase();
  if (value === "MEWS") return "MEWS";
  if (value === "SITEMINDER") return "SITEMINDER";
  if (value === "NONE" || value === "OFF" || value === "DISABLED") return "NONE";
  return DEFAULT_PROVIDER_MODE;
}

export function getActivePmsProviderMode(): PmsProviderMode {
  return normalizeMode(process.env.PMS_ACTIVE_PROVIDER);
}

export function isMewsProviderActive() {
  return getActivePmsProviderMode() === "MEWS";
}

export function isSiteMinderProviderActive() {
  return getActivePmsProviderMode() === "SITEMINDER";
}
