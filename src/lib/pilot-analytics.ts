import { subDays } from "date-fns";

type EventLike = {
  event: string;
  sessionId: string;
  listingId: string | null;
  createdAt: Date;
};

export type FunnelStepSummary = {
  key: string;
  label: string;
  sessions: number;
  events: number;
  conversionFromPrevious: number | null;
};

export type PilotTopListingSummary = {
  listingId: string;
  title: string;
  city: string;
  propertyId: string | null;
  resultClicks: number;
  propertyViews: number;
  checkoutStarts: number;
  teamStayRequests: number;
  bookingProgressions: number;
};

export type PilotAnalyticsDashboard = {
  windowDays: number;
  generatedAt: Date;
  totals: {
    totalEvents: number;
    uniqueSessions: number;
    limehomeEvents: number;
    limehomeSessions: number;
  };
  guestFunnel: FunnelStepSummary[];
  limehomeFunnel: FunnelStepSummary[];
  dailyActivity: Array<{
    day: string;
    siteEvents: number;
    limehomeEvents: number;
  }>;
  topLimehomeListings: PilotTopListingSummary[];
};

const GUEST_FUNNEL_STEPS = [
  {
    key: "search_started",
    label: "Search started",
    events: ["homepage_quick_search_submitted", "search_top_bar_submitted"],
  },
  {
    key: "results_viewed",
    label: "Results viewed",
    events: ["search_results_viewed"],
  },
  {
    key: "listing_clicked",
    label: "Listing clicked",
    events: ["search_result_clicked"],
  },
  {
    key: "property_viewed",
    label: "Property viewed",
    events: ["property_viewed"],
  },
  {
    key: "checkout_started",
    label: "Checkout started",
    events: ["checkout_started"],
  },
  {
    key: "booking_progressed",
    label: "Booking progressed",
    events: ["checkout_redirected_to_stripe", "booking_confirmed_direct"],
  },
];

const LIMEHOME_FUNNEL_STEPS = [
  {
    key: "listing_clicked",
    label: "Limehome listing clicked",
    events: ["search_result_clicked"],
  },
  {
    key: "property_viewed",
    label: "Limehome property viewed",
    events: ["property_viewed"],
  },
  {
    key: "checkout_started",
    label: "Limehome checkout started",
    events: ["checkout_started"],
  },
  {
    key: "team_stay_request_sent",
    label: "Team-stay request sent",
    events: ["team_stay_request_sent"],
  },
  {
    key: "booking_progressed",
    label: "Booking progressed",
    events: ["checkout_redirected_to_stripe", "booking_confirmed_direct"],
  },
];

function uniqueSessionCount(events: EventLike[]) {
  return new Set(events.map((event) => event.sessionId)).size;
}

function summarizeFunnel(
  events: EventLike[],
  steps: Array<{ key: string; label: string; events: string[] }>
): FunnelStepSummary[] {
  let previousSessions: number | null = null;

  return steps.map((step) => {
    const stepEvents = events.filter((event) => step.events.includes(event.event));
    const sessions = uniqueSessionCount(stepEvents);
    const summary: FunnelStepSummary = {
      key: step.key,
      label: step.label,
      sessions,
      events: stepEvents.length,
      conversionFromPrevious:
        previousSessions && previousSessions > 0
          ? Number(((sessions / previousSessions) * 100).toFixed(1))
          : null,
    };
    previousSessions = sessions;
    return summary;
  });
}

export function summarizeAnalyticsSnapshot(params: {
  events: EventLike[];
  limehomeListingIds: Set<string>;
  limehomeListings: Array<{
    id: string;
    title: string;
    city: string;
    pmsExternalPropertyId: string | null;
  }>;
  windowDays: number;
}) {
  const { events, limehomeListingIds, limehomeListings, windowDays } = params;

  const limehomeEvents = events.filter(
    (event) => event.listingId && limehomeListingIds.has(event.listingId)
  );

  const dailyMap = new Map<string, { siteEvents: number; limehomeEvents: number }>();
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = subDays(new Date(), offset).toISOString().slice(0, 10);
    dailyMap.set(day, { siteEvents: 0, limehomeEvents: 0 });
  }

  for (const event of events) {
    const day = event.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(day);
    if (!bucket) continue;
    bucket.siteEvents += 1;
    if (event.listingId && limehomeListingIds.has(event.listingId)) {
      bucket.limehomeEvents += 1;
    }
  }

  const listingSummaries = new Map<string, PilotTopListingSummary>();
  for (const listing of limehomeListings) {
    listingSummaries.set(listing.id, {
      listingId: listing.id,
      title: listing.title,
      city: listing.city,
      propertyId: listing.pmsExternalPropertyId,
      resultClicks: 0,
      propertyViews: 0,
      checkoutStarts: 0,
      teamStayRequests: 0,
      bookingProgressions: 0,
    });
  }

  for (const event of limehomeEvents) {
    if (!event.listingId) continue;
    const summary = listingSummaries.get(event.listingId);
    if (!summary) continue;

    if (event.event === "search_result_clicked") summary.resultClicks += 1;
    if (event.event === "property_viewed") summary.propertyViews += 1;
    if (event.event === "checkout_started") summary.checkoutStarts += 1;
    if (event.event === "team_stay_request_sent") summary.teamStayRequests += 1;
    if (
      event.event === "checkout_redirected_to_stripe" ||
      event.event === "booking_confirmed_direct"
    ) {
      summary.bookingProgressions += 1;
    }
  }

  return {
    windowDays,
    generatedAt: new Date(),
    totals: {
      totalEvents: events.length,
      uniqueSessions: uniqueSessionCount(events),
      limehomeEvents: limehomeEvents.length,
      limehomeSessions: uniqueSessionCount(limehomeEvents),
    },
    guestFunnel: summarizeFunnel(events, GUEST_FUNNEL_STEPS),
    limehomeFunnel: summarizeFunnel(limehomeEvents, LIMEHOME_FUNNEL_STEPS),
    dailyActivity: Array.from(dailyMap.entries()).map(([day, counts]) => ({
      day,
      siteEvents: counts.siteEvents,
      limehomeEvents: counts.limehomeEvents,
    })),
    topLimehomeListings: Array.from(listingSummaries.values())
      .sort((left, right) => {
        return (
          right.propertyViews - left.propertyViews ||
          right.checkoutStarts - left.checkoutStarts ||
          right.resultClicks - left.resultClicks
        );
      })
      .slice(0, 5),
  };
}

export async function getPilotAnalyticsDashboard(windowDays = 30) {
  const { db } = await import("@/lib/db");
  const since = subDays(new Date(), windowDays);

  const [events, limehomeListings] = await Promise.all([
    db.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: {
        event: true,
        sessionId: true,
        listingId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.listing.findMany({
      where: {
        city: "Madrid",
        pmsConnection: { provider: "APALEO" },
      },
      select: {
        id: true,
        title: true,
        city: true,
        pmsExternalPropertyId: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return summarizeAnalyticsSnapshot({
    events,
    limehomeListingIds: new Set(limehomeListings.map((listing) => listing.id)),
    limehomeListings,
    windowDays,
  });
}
