"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateProfile(data: {
  name?: string;
  bio?: string;
  phone?: string;
  linkedinUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Validate fields
  const name = data.name?.trim() || undefined;
  const bio = data.bio?.trim() || undefined;
  const phone = data.phone?.trim() || undefined;
  const linkedinUrl = data.linkedinUrl?.trim() || undefined;

  if (linkedinUrl && !linkedinUrl.startsWith("https://linkedin.com/") && !linkedinUrl.startsWith("https://www.linkedin.com/")) {
    throw new Error("LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(data.bio !== undefined && { bio: bio ?? null }),
      ...(data.phone !== undefined && { phone: phone ?? null }),
      ...(data.linkedinUrl !== undefined && { linkedinUrl: linkedinUrl ?? null }),
    },
  });

  revalidatePath("/account");

  return { success: true };
}
