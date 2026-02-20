import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncIcalForListing } from "@/lib/ical";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
  });

  if (!listing || listing.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update iCal URL if provided
  const body = await req.json();
  if (body.icalUrl) {
    await db.listing.update({
      where: { id },
      data: { icalUrl: body.icalUrl },
    });
  }

  // Sync
  const synced = await syncIcalForListing(id);

  return NextResponse.json({ synced, lastSyncAt: new Date() });
}
