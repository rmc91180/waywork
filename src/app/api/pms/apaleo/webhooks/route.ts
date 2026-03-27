import { NextRequest, NextResponse } from "next/server";
import { applyInboundApaleoWebhook, verifyApaleoInboundRequest } from "@/lib/pms/apaleo-sync";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

export async function POST(request: NextRequest) {
  if (!isApaleoProviderActive()) {
    return NextResponse.json({ error: "Apaleo provider is not active." }, { status: 409 });
  }

  const context = createObservationContext("api.pms.apaleo.inbound.webhook");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const verified = await verifyApaleoInboundRequest({
    accountCode: typeof body.accountCode === "string" ? body.accountCode : null,
    propertyId: typeof body.propertyId === "string" ? body.propertyId : null,
    headerSecret: request.headers.get("x-apaleo-webhook-secret"),
    querySecret: request.nextUrl.searchParams.get("token"),
  });

  if (!verified) {
    return NextResponse.json({ error: "Unauthorized apaleo payload." }, { status: 401 });
  }

  try {
    const result = await applyInboundApaleoWebhook(
      verified.id,
      body as never,
      body,
      false
    );

    logObservation("info", "Processed apaleo reservation webhook", {
      ...context,
      connectionId: verified.id,
      processed: result.processed,
      bookingId: result.bookingId,
      reason: "reason" in result ? result.reason : undefined,
    });

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      bookingId: result.bookingId,
      reason: "reason" in result ? result.reason : undefined,
    });
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed processing apaleo webhook",
      context,
    });

    return NextResponse.json({ error: `Internal processing error (${eventId}).` }, { status: 500 });
  }
}
