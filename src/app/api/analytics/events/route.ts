import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { withDbRetry } from "@/lib/db";

interface AnalyticsRequestBody {
  event?: string;
  properties?: Record<string, unknown>;
  path?: string;
  search?: string;
  sessionId?: string;
  timestamp?: string;
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function inferListingIdFromPath(path: string | undefined) {
  if (!path) return null;
  const listingMatch = path.match(/^\/spaces\/([^/?#]+)/);
  if (listingMatch) return listingMatch[1];
  return null;
}

function inferBookingIdFromPath(path: string | undefined) {
  if (!path) return null;
  const bookingMatch = path.match(/^\/bookings\/([^/?#]+)/);
  if (bookingMatch) return bookingMatch[1];
  return null;
}

function shouldPersistAnalytics() {
  if (process.env.FORCE_ANALYTICS_PERSISTENCE === "1") return true;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;

  try {
    const parsed = new URL(databaseUrl);
    return !(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyticsRequestBody;

    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json(
        { error: "Missing event name" },
        { status: 400 }
      );
    }

    const eventName = body.event;
    const path = body.path || request.nextUrl.pathname;
    const listingId =
      getStringValue(body.properties?.listingId) || inferListingIdFromPath(path);
    const bookingId =
      getStringValue(body.properties?.bookingId) || inferBookingIdFromPath(path);
    const properties = (body.properties || {}) as Prisma.InputJsonValue;

    if (shouldPersistAnalytics()) {
      await withDbRetry((client) =>
        client.analyticsEvent.create({
          data: {
            userId: null,
            listingId,
            bookingId,
            event: eventName,
            path,
            search: body.search || "",
            sessionId: body.sessionId || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
            referrer: request.headers.get("referer") || null,
            properties,
            ...(body.timestamp ? { createdAt: new Date(body.timestamp) } : {}),
          },
        })
      ).catch((error) => {
        console.error("[analytics] persistence error", error);
      });
    }

    console.info("[analytics]", {
      event: body.event,
      path,
      search: body.search || "",
      sessionId: body.sessionId || "unknown",
      timestamp: body.timestamp || new Date().toISOString(),
      properties: body.properties || {},
      userAgent: request.headers.get("user-agent") || "unknown",
      userId: "anonymous",
      listingId,
      bookingId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics] ingestion error", error);
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  }
}
