import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as unknown;
    const { email } = schema.parse(body);

    // Store in AnalyticsEvent table (no schema change needed)
    // A proper newsletter table can be added later; for now this captures intent.
    await db.analyticsEvent.create({
      data: {
        event: "newsletter_signup",
        sessionId: "newsletter",
        properties: { email, source: "footer" },
      },
    });

    // Optionally add to Resend audience if configured
    if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
      await fetch("https://api.resend.com/audiences/" + process.env.RESEND_AUDIENCE_ID + "/contacts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[newsletter] signup error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
