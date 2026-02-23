"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ============================================================================
// TOGGLE FAVORITE
// ============================================================================

export async function toggleFavorite(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.favorite.findUnique({
    where: {
      userId_listingId: {
        userId: session.user.id,
        listingId,
      },
    },
  });

  if (existing) {
    await db.favorite.delete({
      where: { id: existing.id },
    });

    revalidatePath("/favorites");
    revalidatePath(`/spaces/${listingId}`);
    return { favorited: false };
  }

  await db.favorite.create({
    data: {
      userId: session.user.id,
      listingId,
    },
  });

  revalidatePath("/favorites");
  revalidatePath(`/spaces/${listingId}`);
  return { favorited: true };
}

// ============================================================================
// GET FAVORITES
// ============================================================================

export async function getFavorites() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      listing: {
        include: {
          images: {
            orderBy: { order: "asc" },
            take: 1,
            select: { url: true, alt: true },
          },
          connectivityProfile: {
            select: {
              declaredDownloadMbps: true,
              networkType: true,
              verified: true,
            },
          },
          host: {
            select: { name: true, image: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((fav) => fav.listing);
}

// ============================================================================
// CHECK IF FAVORITED
// ============================================================================

export async function isFavorited(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;

  const favorite = await db.favorite.findUnique({
    where: {
      userId_listingId: {
        userId: session.user.id,
        listingId,
      },
    },
  });

  return !!favorite;
}
