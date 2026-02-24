import { NextRequest, NextResponse } from "next/server";

interface AnalyticsRequestBody {
  event?: string;
  properties?: Record<string, unknown>;
  path?: string;
  search?: string;
  sessionId?: string;
  timestamp?: string;
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

    // Persist to logs for now; can be forwarded to external sinks later.
    console.info("[analytics]", {
      event: body.event,
      path: body.path || request.nextUrl.pathname,
      search: body.search || "",
      sessionId: body.sessionId || "unknown",
      timestamp: body.timestamp || new Date().toISOString(),
      properties: body.properties || {},
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics] ingestion error", error);
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  }
}
