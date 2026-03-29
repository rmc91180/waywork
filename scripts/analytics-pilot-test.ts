import { summarizeAnalyticsSnapshot } from "../src/lib/pilot-analytics";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const now = new Date("2026-03-29T12:00:00.000Z");

const summary = summarizeAnalyticsSnapshot({
  windowDays: 7,
  limehomeListingIds: new Set(["listing-limehome-1", "listing-limehome-2"]),
  limehomeListings: [
    {
      id: "listing-limehome-1",
      title: "Limehome Madrid Doctor Fleming Team Apartment",
      city: "Madrid",
      pmsExternalPropertyId: "limehome-madrid-chamartin",
    },
    {
      id: "listing-limehome-2",
      title: "Limehome Madrid Plaza de Espana Residence",
      city: "Madrid",
      pmsExternalPropertyId: "limehome-madrid-centro",
    },
  ],
  events: [
    { event: "homepage_quick_search_submitted", sessionId: "s1", listingId: null, createdAt: now },
    { event: "search_results_viewed", sessionId: "s1", listingId: null, createdAt: now },
    { event: "search_result_clicked", sessionId: "s1", listingId: "listing-limehome-1", createdAt: now },
    { event: "property_viewed", sessionId: "s1", listingId: "listing-limehome-1", createdAt: now },
    { event: "checkout_started", sessionId: "s1", listingId: "listing-limehome-1", createdAt: now },
    { event: "team_stay_request_sent", sessionId: "s1", listingId: "listing-limehome-1", createdAt: now },
    { event: "checkout_redirected_to_stripe", sessionId: "s1", listingId: "listing-limehome-1", createdAt: now },
    { event: "search_top_bar_submitted", sessionId: "s2", listingId: null, createdAt: now },
    { event: "search_results_viewed", sessionId: "s2", listingId: null, createdAt: now },
    { event: "search_result_clicked", sessionId: "s2", listingId: "listing-limehome-2", createdAt: now },
    { event: "property_viewed", sessionId: "s2", listingId: "listing-limehome-2", createdAt: now },
    { event: "checkout_started", sessionId: "s2", listingId: "listing-limehome-2", createdAt: now },
    { event: "search_result_clicked", sessionId: "s3", listingId: "listing-other", createdAt: now },
  ],
});

assert(summary.totals.totalEvents === 13, "expected all events to be counted");
assert(summary.totals.uniqueSessions === 3, "expected unique site sessions");
assert(summary.totals.limehomeEvents === 8, "expected limehome event count");
assert(summary.totals.limehomeSessions === 2, "expected limehome session count");

const guestCheckout = summary.guestFunnel.find((step) => step.key === "checkout_started");
assert(guestCheckout?.sessions === 2, "expected guest checkout starts");

const limehomeTeamStay = summary.limehomeFunnel.find(
  (step) => step.key === "team_stay_request_sent"
);
assert(limehomeTeamStay?.sessions === 1, "expected a single team stay request session");

assert(
  summary.topLimehomeListings[0]?.listingId === "listing-limehome-1",
  "expected top listing ordering by property views"
);

console.log("analytics-pilot-test: ok");
