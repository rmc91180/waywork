import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAriSyncForConnection } from "@/lib/pms/mews-sync";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { connectionId?: string };
    let connectionId = body.connectionId;

    if (!connectionId) {
      const connection = await db.pmsConnection.findFirst({
        where: {
          userId: session.user.id,
          provider: "MEWS",
        },
        select: { id: true },
      });
      connectionId = connection?.id;
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: "No Mews connection configured for this user." },
        { status: 404 }
      );
    }

    const connection = await db.pmsConnection.findUnique({
      where: { id: connectionId },
      select: { userId: true },
    });

    if (!connection || connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await requestAriSyncForConnection(connectionId);
    return NextResponse.json({ ok: true, response });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to request ARI sync from Mews.",
      },
      { status: 500 }
    );
  }
}
