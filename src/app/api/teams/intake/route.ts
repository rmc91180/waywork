import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  teamSize: z.string().min(1),
  duration: z.string().optional(),
  purpose: z.string().optional(),
  city: z.string().min(1),
  dates: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as unknown;
    const data = schema.parse(body);

    // Store in AnalyticsEvent — no schema change needed
    await db.analyticsEvent.create({
      data: {
        event: "for_teams_intake",
        properties: data,
      },
    });

    // Notify internal team
    const internalEmail = process.env.TEAMS_NOTIFY_EMAIL ?? "teams@waywork.com";
    await sendEmail({
      to: internalEmail,
      subject: `New team offsite request — ${data.city} · ${data.teamSize} people`,
      html: `
        <h2>New For Teams intake</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
          <tr><td><strong>Name</strong></td><td>${data.name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${data.email}</td></tr>
          <tr><td><strong>Company</strong></td><td>${data.company ?? "—"}</td></tr>
          <tr><td><strong>Team size</strong></td><td>${data.teamSize}</td></tr>
          <tr><td><strong>Duration</strong></td><td>${data.duration ?? "—"}</td></tr>
          <tr><td><strong>Purpose</strong></td><td>${data.purpose ?? "—"}</td></tr>
          <tr><td><strong>City</strong></td><td>${data.city}</td></tr>
          <tr><td><strong>Dates</strong></td><td>${data.dates ?? "—"}</td></tr>
          <tr><td><strong>Notes</strong></td><td>${data.notes ?? "—"}</td></tr>
        </table>
      `,
    });

    // Auto-reply to requester
    await sendEmail({
      to: data.email,
      subject: "We got your offsite request — expect options within 48h",
      html: `
        <h2>Thanks, ${data.name.split(" ")[0]}!</h2>
        <p>We received your request for a team offsite in <strong>${data.city}</strong> for <strong>${data.teamSize} people</strong>.</p>
        <p>Our team will send you 3–5 curated options within 48 hours. In the meantime you can browse available spaces at <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com"}/search">waywork.com/search</a>.</p>
        <p>Questions? Reply to this email or reach us at teams@waywork.com.</p>
        <p>— The WayWork team</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[teams/intake]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
