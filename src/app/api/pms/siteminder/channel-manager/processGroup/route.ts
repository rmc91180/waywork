import { NextRequest, NextResponse } from "next/server";
import {
  applyInboundSiteMinderReservation,
  normalizeSiteMinderReservations,
  parseInboundSoap,
  verifySiteMinderInboundPayload,
} from "@/lib/pms/siteminder-inbound";
import { buildSoapResponse } from "@/lib/pms/siteminder-xml";
import { createObservationContext, captureObservedError, logObservation } from "@/lib/observability";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";

export async function POST(request: NextRequest) {
  if (!isSiteMinderProviderActive()) {
    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelResNotifRS",
        success: false,
        code: "409",
        message: "SiteMinder provider is not active.",
      }),
      { status: 409, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }

  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelResNotifRS",
        success: false,
        code: "400",
        message: "Empty request body.",
      }),
      { status: 400, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }

  const context = createObservationContext("api.pms.siteminder.inbound.reservations");

  try {
    const parsed = parseInboundSoap(rawBody);
    const verified = await verifySiteMinderInboundPayload({
      header: parsed.header,
      body: parsed.body,
      webhookSecretHeader: request.headers.get("x-siteminder-webhook-secret"),
    });

    if (!verified) {
      return new NextResponse(
        buildSoapResponse({
          rootName: "OTA_HotelResNotifRS",
          success: false,
          code: "401",
          message: "Unauthorized SiteMinder payload.",
        }),
        { status: 401, headers: { "Content-Type": "text/xml; charset=utf-8" } }
      );
    }

    const reservations = normalizeSiteMinderReservations(parsed.body);

    let processed = 0;
    let skipped = 0;
    for (const reservation of reservations) {
      const result = await applyInboundSiteMinderReservation(
        verified.connection.id,
        reservation,
        parsed.body
      );
      if (result.processed) processed += 1;
      else skipped += 1;
    }

    logObservation("info", "Processed SiteMinder reservation push", {
      ...context,
      connectionId: verified.connection.id,
      processed,
      skipped,
    });

    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelResNotifRS",
        success: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "X-WayWork-Processed": String(processed),
          "X-WayWork-Skipped": String(skipped),
        },
      }
    );
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed processing SiteMinder reservation push",
      context,
    });

    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelResNotifRS",
        success: false,
        code: "500",
        message: `Internal processing error (${eventId}).`,
      }),
      { status: 500, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
}
