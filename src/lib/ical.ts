import ICAL from "ical.js";
import { db } from "@/lib/db";

/**
 * Parse an iCal feed and return blocked dates
 */
export function parseIcalFeed(icalData: string): Date[] {
  const blockedDates: Date[] = [];

  try {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const events = comp.getAllSubcomponents("vevent");

    for (const event of events) {
      const icalEvent = new ICAL.Event(event);
      const startDate = icalEvent.startDate;
      const endDate = icalEvent.endDate;

      if (!startDate) continue;

      // For date-only events (all-day), add each day in the range
      const start = startDate.toJSDate();
      const end = endDate ? endDate.toJSDate() : new Date(start.getTime() + 86400000);

      const current = new Date(start);
      while (current < end) {
        blockedDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
  } catch (error) {
    console.error("Failed to parse iCal feed:", error);
  }

  return blockedDates;
}

/**
 * Sync an iCal feed for a listing
 */
export async function syncIcalForListing(listingId: string): Promise<number> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { icalUrl: true },
  });

  if (!listing?.icalUrl) return 0;

  // Fetch the iCal feed
  const response = await fetch(listing.icalUrl, {
    headers: { "User-Agent": "WayWork/1.0" },
  });

  if (!response.ok) {
    console.error(`Failed to fetch iCal for listing ${listingId}: ${response.status}`);
    return 0;
  }

  const icalData = await response.text();
  const blockedDates = parseIcalFeed(icalData);

  if (blockedDates.length === 0) return 0;

  // Remove old iCal blocked dates
  await db.blockedDate.deleteMany({
    where: { listingId, source: "ICAL" },
  });

  // Add new ones — only future dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDates = blockedDates.filter((d) => d >= today);

  let synced = 0;
  for (const date of futureDates) {
    try {
      await db.blockedDate.upsert({
        where: {
          listingId_date: { listingId, date },
        },
        create: {
          listingId,
          date,
          source: "ICAL",
        },
        update: {
          source: "ICAL",
        },
      });
      synced++;
    } catch {
      // Skip duplicates
    }
  }

  // Update sync timestamp
  await db.listing.update({
    where: { id: listingId },
    data: { icalLastSyncAt: new Date() },
  });

  return synced;
}

/**
 * Sync all listings with iCal URLs
 */
export async function syncAllIcalFeeds(): Promise<void> {
  const listings = await db.listing.findMany({
    where: {
      icalUrl: { not: null },
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    select: { id: true, title: true },
  });

  console.log(`Syncing iCal for ${listings.length} listings...`);

  for (const listing of listings) {
    try {
      const count = await syncIcalForListing(listing.id);
      console.log(`Synced ${count} dates for: ${listing.title}`);
    } catch (error) {
      console.error(`Failed to sync iCal for ${listing.id}:`, error);
    }
  }
}
