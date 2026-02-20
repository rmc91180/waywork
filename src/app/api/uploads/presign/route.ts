import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { presignUploadSchema } from "@/lib/validators";
import { getPresignedUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = presignUploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { contentType, folder } = parsed.data;
  const extension = contentType.split("/")[1];

  const result = await getPresignedUploadUrl(folder, contentType, extension);

  return NextResponse.json(result);
}
