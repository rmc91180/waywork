export interface AnalyticsPayload {
  event: string;
  properties?: Record<string, unknown>;
}

declare global {
  interface Window {
    __wwAnalyticsSessionId?: string;
  }
}

function getSessionId() {
  if (typeof window === "undefined") return "server";
  if (window.__wwAnalyticsSessionId) {
    return window.__wwAnalyticsSessionId;
  }
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `ww-${Math.random().toString(36).slice(2, 10)}`;
  window.__wwAnalyticsSessionId = id;
  return id;
}

export function trackEvent(payload: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  const body = {
    ...payload,
    path: window.location.pathname,
    search: window.location.search,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(body);

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", serialized);
    return;
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
    keepalive: true,
  }).catch(() => {
    // Non-blocking analytics sink.
  });
}
