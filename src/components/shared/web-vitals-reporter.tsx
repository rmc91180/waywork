"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/analytics";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    trackEvent({
      event: "web_vital",
      properties: {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        navigationType: metric.navigationType,
      },
    });
  });

  return null;
}
