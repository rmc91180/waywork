import { addDays, isBefore, startOfDay } from "date-fns";
import { db } from "@/lib/db";

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export function extractMewsTokens(payload: Record<string, unknown>) {
  return {
    clientToken: readString(payload, ["ClientToken", "clientToken", "client_token"]),
    connectionToken: readString(payload, [
      "ConnectionToken",
      "connectionToken",
      "connection_token",
    ]),
    messageId: readString(payload, ["MessageId", "messageId", "message_id"]),
  };
}

export async function findMewsConnection(payload: Record<string, unknown>) {
  const { clientToken, connectionToken } = extractMewsTokens(payload);
  if (!clientToken || !connectionToken) {
    return null;
  }

  return db.pmsConnection.findFirst({
    where: {
      provider: "MEWS",
      enabled: true,
      mewsClientToken: clientToken,
      mewsConnectionToken: connectionToken,
    },
  });
}

export async function createInboundSyncEvent(input: {
  connectionId: string;
  action: string;
  success: boolean;
  listingId?: string | null;
  bookingId?: string | null;
  messageId?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  error?: string | null;
}) {
  await db.pmsSyncEvent.create({
    data: {
      connectionId: input.connectionId,
      listingId: input.listingId || undefined,
      bookingId: input.bookingId || undefined,
      direction: "INBOUND",
      action: input.action,
      success: input.success,
      messageId: input.messageId || undefined,
      requestPayload:
        input.requestPayload && typeof input.requestPayload === "object"
          ? (input.requestPayload as object)
          : undefined,
      responsePayload:
        input.responsePayload && typeof input.responsePayload === "object"
          ? (input.responsePayload as object)
          : undefined,
      error: input.error || undefined,
    },
  });
}

export function parseDateRange(startRaw: string, endRaw: string) {
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("Invalid date range.");
  }
  return { start: startOfDay(start), end: startOfDay(end) };
}

export function dateRangeDays(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const last = startOfDay(end);
  while (isBefore(current, last)) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}
