"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { SearchUiVariant } from "@/lib/experiments";

interface SearchExperimentTrackerProps {
  variant: SearchUiVariant;
}

export function SearchExperimentTracker({ variant }: SearchExperimentTrackerProps) {
  useEffect(() => {
    trackEvent({
      event: "experiment_exposure",
      properties: {
        experiment: "search_ui_v1",
        variant,
      },
    });
  }, [variant]);

  return null;
}
