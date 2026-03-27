export interface ListingReadinessInput {
  imageCount: number;
  amenityCount: number;
  hasConnectivityProfile: boolean;
  availabilityRuleCount: number;
  descriptionLength: number;
  hasPayoutSetup: boolean;
  pmsConnectionEnabled: boolean;
  pmsHasRequiredCredentials: boolean;
  pmsProviderLabel?: string;
  hasPmsListingMapping: boolean;
}

export interface ListingReadinessResult {
  ready: boolean;
  reasons: string[];
}

export interface ListingPmsReadinessInput {
  provider?: "MEWS" | "SITEMINDER" | "APALEO" | null;
  enabled?: boolean | null;
  mewsClientToken?: string | null;
  mewsConnectionToken?: string | null;
  siteminderClientId?: string | null;
  siteminderClientSecret?: string | null;
  apaleoClientId?: string | null;
  apaleoClientSecret?: string | null;
  apaleoRefreshToken?: string | null;
}

export function getListingPmsReadiness(input: ListingPmsReadinessInput) {
  const provider = input.provider || "SITEMINDER";
  if (provider === "MEWS") {
    return {
      pmsConnectionEnabled: Boolean(input.enabled),
      pmsHasRequiredCredentials:
        Boolean(input.mewsClientToken) && Boolean(input.mewsConnectionToken),
      pmsProviderLabel: "Mews PMS",
    };
  }

  if (provider === "APALEO") {
    return {
      pmsConnectionEnabled: Boolean(input.enabled),
      pmsHasRequiredCredentials:
        Boolean(input.apaleoClientId) &&
        Boolean(input.apaleoClientSecret) &&
        Boolean(input.apaleoRefreshToken),
      pmsProviderLabel: "apaleo PMS",
    };
  }

  return {
    pmsConnectionEnabled: Boolean(input.enabled),
    pmsHasRequiredCredentials:
      Boolean(input.siteminderClientId) && Boolean(input.siteminderClientSecret),
    pmsProviderLabel: "SiteMinder channel manager",
  };
}

export function evaluateListingProductionReadiness(
  input: ListingReadinessInput
): ListingReadinessResult {
  const reasons: string[] = [];

  if (input.imageCount < 3) {
    reasons.push("Add at least 3 listing photos.");
  }

  if (input.amenityCount < 3) {
    reasons.push("Add at least 3 amenities.");
  }

  if (!input.hasConnectivityProfile) {
    reasons.push("Add a connectivity profile.");
  }

  if (input.availabilityRuleCount < 1) {
    reasons.push("Add at least one weekly availability rule.");
  }

  if (input.descriptionLength < 120) {
    reasons.push("Expand listing description to at least 120 characters.");
  }

  if (!input.hasPayoutSetup) {
    reasons.push("Connect Stripe payouts before publishing.");
  }

  const providerLabel = input.pmsProviderLabel || "channel manager";
  if (!input.pmsConnectionEnabled || !input.pmsHasRequiredCredentials) {
    reasons.push(`Connect and enable ${providerLabel} credentials.`);
  }

  if (!input.hasPmsListingMapping) {
    reasons.push("Map this listing to your external channel manager listing ID.");
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
