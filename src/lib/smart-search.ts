import type { SearchFilterState } from "@/lib/search-filters";

interface SmartSearchResult {
  updates: Partial<SearchFilterState>;
  highlights: string[];
}

const SPEED_TERMS = ["fast wifi", "fast internet", "reliable wifi", "strong internet", "good wifi"];

export function interpretSmartSearchPrompt(input: string): SmartSearchResult {
  const text = input.trim().toLowerCase();
  if (!text) return { updates: {}, highlights: [] };

  const updates: Partial<SearchFilterState> = {};
  const highlights: string[] = [];

  const guestsMatch = text.match(/(\d{1,2})\s*(guest|people|person|pax)/);
  if (guestsMatch) {
    updates.guests = guestsMatch[1];
    highlights.push(`${guestsMatch[1]} guests`);
  }

  const bedroomMatch = text.match(/(\d{1,2})\s*(bedroom|bedrooms|bed)\b/);
  if (bedroomMatch) {
    updates.minBedrooms = bedroomMatch[1];
    highlights.push(`${bedroomMatch[1]}+ bedrooms`);
  }

  const maxPriceMatch = text.match(/(?:under|max|below)\s*\$?(\d{2,4})/);
  if (maxPriceMatch) {
    updates.maxPrice = maxPriceMatch[1];
    highlights.push(`max $${maxPriceMatch[1]}/day`);
  }

  const minPriceMatch = text.match(/(?:over|min|above|at least)\s*\$?(\d{2,4})/);
  if (minPriceMatch) {
    updates.minPrice = minPriceMatch[1];
    highlights.push(`min $${minPriceMatch[1]}/day`);
  }

  const nearMatch = text.match(/near\s+([a-z0-9 ,.'-]{2,80})/);
  if (nearMatch) {
    updates.nearQuery = nearMatch[1].trim();
    highlights.push(`near ${nearMatch[1].trim()}`);
  }

  if (text.includes("pool")) {
    updates.hasSwimmingPool = true;
    highlights.push("swimming pool");
  }

  if (text.includes("jacuzzi") || text.includes("hot tub")) {
    updates.hasJacuzzi = true;
    highlights.push("jacuzzi");
  }

  if (text.includes("backyard") || text.includes("garden")) {
    updates.hasBackyard = true;
    highlights.push("backyard");
  }

  if (text.includes("ping pong") || text.includes("table tennis")) {
    updates.hasPingPongTable = true;
    highlights.push("ping pong");
  }

  if (text.includes("pool table") || text.includes("billiards")) {
    updates.hasPoolTable = true;
    highlights.push("pool table");
  }

  if (SPEED_TERMS.some((term) => text.includes(term))) {
    updates.verifiedInternet = true;
    updates.minSpeed = "200";
    highlights.push("verified 200+ Mbps");
  }

  if (text.includes("team") || text.includes("workshop") || text.includes("offsite")) {
    updates.workspaceTypes = ["MEETING_ROOM", "HYBRID_SPACE", "STUDIO"];
    highlights.push("team-ready workspace");
  }

  if (text.includes("focus") || text.includes("quiet")) {
    updates.workspaceTypes = Array.from(
      new Set([...(updates.workspaceTypes || []), "PRIVATE_OFFICE", "HOME_OFFICE"])
    );
    updates.minWorkScore = Math.max(70, updates.minWorkScore || 0);
    highlights.push("focus-friendly workspace");
  }

  if (text.includes("strict cancel")) {
    updates.cancellationPolicies = ["STRICT"];
    highlights.push("strict cancellation");
  } else if (text.includes("flexible cancel")) {
    updates.cancellationPolicies = ["FLEXIBLE"];
    highlights.push("flexible cancellation");
  }

  return {
    updates,
    highlights: Array.from(new Set(highlights)),
  };
}
