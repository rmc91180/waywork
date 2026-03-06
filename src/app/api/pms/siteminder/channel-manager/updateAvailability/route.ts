import { NextRequest, NextResponse } from "next/server";
import {
  applyInboundSiteMinderAvailability,
  normalizeSiteMinderAvailability,
  parseInboundSoap,
  verifySiteMinderInboundPayload,
} from "@/lib/pms/siteminder-inbound";
import { buildSoapResponse } from "@/lib/pms/siteminder-xml";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";

export async function POST(request: NextRequest) {
  if (!isSiteMinderProviderActive()) {
    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelAvailNotifRS",
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
        rootName: "OTA_HotelAvailNotifRS",
        success: false,
        code: "400",
        message: "Empty request body.",
      }),
      { status: 400, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }

  const context = createObservationContext("api.pms.siteminder.inbound.availability");

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
          rootName: "OTA_HotelAvailNotifRS",
          success: false,
          code: "401",
          message: "Unauthorized SiteMinder payload.",
        }),
        { status: 401, headers: { "Content-Type": "text/xml; charset=utf-8" } }
      );
    }

    const updates = normalizeSiteMinderAvailability(parsed.body);
    let processed = 0;
    let skipped = 0;

    for (const update of updates) {
      const result = await applyInboundSiteMinderAvailability(verified.connection.id, update, parsed.body);
      if (result.processed) processed += 1;
      else skipped += 1;
    }

    logObservation("info", "Processed SiteMinder availability push", {
      ...context,
      connectionId: verified.connection.id,
      processed,
      skipped,
    });

    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelAvailNotifRS",
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
      message: "Failed processing SiteMinder availability push",
      context,
    });

    return new NextResponse(
      buildSoapResponse({
        rootName: "OTA_HotelAvailNotifRS",
        success: false,
        code: "500",
        message: `Internal processing error (${eventId}).`,
      }),
      { status: 500, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
}
