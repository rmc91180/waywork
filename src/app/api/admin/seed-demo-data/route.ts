import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-seed";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDemoData(db);

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/listings");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed demo data error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
