"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertListingAccess } from "@/lib/host-access";

export async function addListingManager(listingId: string, managerEmail: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER"]);

  const normalizedEmail = managerEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Manager email is required.");
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("User not found. Ask the manager to create an account first.");
  }

  if (user.id === session.user.id) {
    throw new Error("Owner already has full access.");
  }

  await db.listingTeamMember.upsert({
    where: {
      listingId_userId: {
        listingId,
        userId: user.id,
      },
    },
    create: {
      listingId,
      userId: user.id,
      role: "MANAGER",
      createdById: session.user.id,
    },
    update: {
      role: "MANAGER",
      createdById: session.user.id,
    },
  });

  revalidatePath("/host");
  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
}

export async function removeListingManager(listingId: string, managerUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER"]);

  await db.listingTeamMember.deleteMany({
    where: {
      listingId,
      userId: managerUserId,
    },
  });

  revalidatePath("/host");
  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
}
