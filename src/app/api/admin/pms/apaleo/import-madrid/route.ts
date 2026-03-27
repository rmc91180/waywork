import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { importApaleoMadridListings } from "@/lib/pms/apaleo-import";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

const requestSchema = z.object({
  hostEmail: z.string().email(),
  hostName: z.string().min(1).max(120).optional(),
  accountCode: z.string().min(1).max(120).optional(),
  useFixtures: z.boolean().optional(),
});

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
      { error: "Invalid apaleo Madrid import payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await importApaleoMadridListings({
      hostEmail: parsed.data.hostEmail,
      hostName: parsed.data.hostName,
      accountCode: parsed.data.accountCode,
      useFixtures: parsed.data.useFixtures ?? true,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/listings");
    revalidatePath("/host");
    revalidatePath("/search");

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown apaleo Madrid import error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
