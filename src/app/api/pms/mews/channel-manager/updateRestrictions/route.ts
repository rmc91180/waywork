import { NextRequest, NextResponse } from "next/server";
import {
  createInboundSyncEvent,
  extractMewsTokens,
  findMewsConnection,
} from "@/lib/pms/mews-inbound";
import { createObservationContext, logObservation } from "@/lib/observability";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> = {};
  try {
    const json = (await request.json()) as unknown;
    payload = asRecord(json) || {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const connection = await findMewsConnection(payload);
  const { messageId } = extractMewsTokens(payload);
  if (!connection) {
    return NextResponse.json({ error: "Unauthorized Mews connection" }, { status: 401 });
  }
  const routeContext = createObservationContext("api.pms.mews.inbound.updateRestrictions", {
    connectionId: connection.id,
    messageId,
  });

  await createInboundSyncEvent({
    connectionId: connection.id,
    action: "UPDATE_RESTRICTIONS",
    success: true,
    messageId,
    requestPayload: payload,
    responsePayload: {
      accepted: true,
      note: "Restrictions updates are logged and can be mapped to local policy rules.",
    },
  });
  logObservation("info", "Inbound restrictions payload recorded", routeContext);

  return NextResponse.json({
    ok: true,
    accepted: true,
    note: "Restriction payload recorded.",
  });
}
