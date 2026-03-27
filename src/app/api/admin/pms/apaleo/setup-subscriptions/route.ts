import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setupApaleoSubscriptions } from "@/lib/pms/apaleo-sync";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

const requestSchema = z
  .object({
    connectionId: z.string().min(1).optional(),
    hostEmail: z.string().email().optional(),
    baseUrl: z.string().url().optional(),
    useFixtures: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.connectionId || value.hostEmail), {
    message: "Provide either connectionId or hostEmail.",
    path: ["connectionId"],
  });

async function resolveConnectionId(input: { connectionId?: string; hostEmail?: string }) {
  if (input.connectionId) return input.connectionId;

  const user = await db.user.findUnique({
    where: { email: input.hostEmail },
    select: {
      pmsConnections: {
        where: { provider: "APALEO" },
        select: { id: true },
        take: 1,
      },
    },
  });

  return user?.pmsConnections[0]?.id || null;
}

export async function POST(request: NextRequest) {
  if (!isApaleoProviderActive()) {
    return NextResponse.json(
      { error: "Apaleo provider is not active in this environment." },
      { status: 409 }
    );
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid apaleo setup-subscriptions payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const connectionId = await resolveConnectionId(parsed.data);
  if (!connectionId) {
    return NextResponse.json({ error: "Apaleo connection not found." }, { status: 404 });
  }

  try {
    const result = await setupApaleoSubscriptions(connectionId, {
      baseUrl: parsed.data.baseUrl,
      useFixtures: parsed.data.useFixtures ?? true,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/listings");
    revalidatePath("/host");

    return NextResponse.json({
      ok: true,
      connectionId,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown apaleo subscription setup error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
