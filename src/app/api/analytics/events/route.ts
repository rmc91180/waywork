import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyticsRequestBody;

    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json(
        { error: "Missing event name" },
        { status: 400 }
      );
    }

    const path = body.path || request.nextUrl.pathname;
    const session = await auth();
    const listingId =
      getStringValue(body.properties?.listingId) || inferListingIdFromPath(path);
    const bookingId =
      getStringValue(body.properties?.bookingId) || inferBookingIdFromPath(path);
    const properties = (body.properties || {}) as Prisma.InputJsonValue;

    await db.analyticsEvent
      .create({
        data: {
          userId: session?.user?.id || null,
          listingId,
          bookingId,
          event: body.event,
          path,
          search: body.search || "",
          sessionId: body.sessionId || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          referrer: request.headers.get("referer") || null,
          properties,
          createdAt: body.timestamp ? new Date(body.timestamp) : undefined,
        },
      })
      .catch((error) => {
        console.error("[analytics] persistence error", error);
      });

    console.info("[analytics]", {
      event: body.event,
      path,
      search: body.search || "",
      sessionId: body.sessionId || "unknown",
      timestamp: body.timestamp || new Date().toISOString(),
      properties: body.properties || {},
      userAgent: request.headers.get("user-agent") || "unknown",
      userId: session?.user?.id || "anonymous",
      listingId,
      bookingId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics] ingestion error", error);
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  }
}
