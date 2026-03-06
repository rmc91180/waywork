export interface ListingReadinessInput {
  imageCount: number;
  amenityCount: number;
  hasConnectivityProfile: boolean;
  availabilityRuleCount: number;
  descriptionLength: number;
  hasPayoutSetup: boolean;
  mewsConnectionEnabled: boolean;
  mewsHasRequiredTokens: boolean;
  hasPmsListingMapping: boolean;
}

export interface ListingReadinessResult {
  ready: boolean;
  reasons: string[];
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

  if (!input.mewsConnectionEnabled || !input.mewsHasRequiredTokens) {
    reasons.push("Connect and enable SiteMinder channel manager credentials.");
  }

  if (!input.hasPmsListingMapping) {
    reasons.push("Map this listing to your external channel manager listing ID.");
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
