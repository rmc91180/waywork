import * as Sentry from "@sentry/node";

let sentryInitialized = false;

function initSentry() {
  if (sentryInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0"),
  });

  sentryInitialized = true;
}

export interface ObservationContext {
  eventId: string;
  source: string;
  timestamp: string;
  [key: string]: unknown;
}

export function createObservationContext(
  source: string,
  details: Record<string, unknown> = {}
): ObservationContext {
  return {
    eventId: crypto.randomUUID(),
    source,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

export function logObservation(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown>
) {
  const payload = {
    level,
    message,
    ...context,
  };
  const text = JSON.stringify(payload);

  if (level === "error") {
    console.error(text);
    return;
  }
  if (level === "warn") {
    console.warn(text);
    return;
  }
  console.log(text);
}

export function captureObservedError(input: {
  error: unknown;
  message: string;
  context: Record<string, unknown>;
}): string {
  const eventId = typeof input.context.eventId === "string"
    ? input.context.eventId
    : crypto.randomUUID();

  logObservation("error", input.message, {
    ...input.context,
    eventId,
    error:
      input.error instanceof Error
        ? { name: input.error.name, message: input.error.message, stack: input.error.stack }
        : input.error,
  });

  initSentry();
  if (sentryInitialized) {
    Sentry.withScope((scope) => {
      scope.setTag("source", String(input.context.source || "unknown"));
      scope.setExtra("eventId", eventId);
      scope.setExtras(input.context);
      Sentry.captureException(
        input.error instanceof Error ? input.error : new Error(String(input.error))
      );
    });
  }

  return eventId;
}
