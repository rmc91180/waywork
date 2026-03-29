import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prepareApaleoPilotCutover } from "@/lib/pms/apaleo-pilot-cutover";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

const requestSchema = z.object({
  hostEmail: z.string().email(),
  hostName: z.string().min(1).max(120).optional(),
  accountCode: z.string().min(1).max(120).optional(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  webhookSecret: z.string().min(1).optional(),
  stripeConnectAccountId: z.string().min(1).optional(),
  bookingCommissionPercent: z.number().min(0).max(100).nullable().optional(),
  baseUrl: z.string().url().optional(),
  runLaunchSequence: z.boolean().optional(),
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
      { error: "Invalid apaleo pilot cutover payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await prepareApaleoPilotCutover(parsed.data);

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/listings");
    revalidatePath("/admin/pms/apaleo");
    revalidatePath("/host");
    revalidatePath("/host/payouts");
    revalidatePath("/search");

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown apaleo cutover error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
