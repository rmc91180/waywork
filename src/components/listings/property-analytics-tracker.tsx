"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

interface PropertyAnalyticsTrackerProps {
  listingId: string;
  title: string;
  city: string;
  maxGuests: number;
  hasTeamStayOption: boolean;
}

export function PropertyAnalyticsTracker({
  listingId,
  title,
  city,
  maxGuests,
  hasTeamStayOption,
}: PropertyAnalyticsTrackerProps) {
  useEffect(() => {
    trackEvent({
      event: "property_viewed",
      properties: {
        listingId,
        title,
        city,
        maxGuests,
        hasTeamStayOption,
      },
    });
  }, [city, hasTeamStayOption, listingId, maxGuests, title]);

  return null;
}
