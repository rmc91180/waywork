import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

export type ListingAccessRole = "OWNER" | "MANAGER";

export function buildHostListingScope(userId: string): Prisma.ListingWhereInput {
  return {
    OR: [{ hostId: userId }, { teamMembers: { some: { userId } } }],
  };
}

export async function getListingAccessRole(
  userId: string,
  listingId: string
): Promise<ListingAccessRole | null> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      hostId: true,
      teamMembers: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!listing) return null;
  if (listing.hostId === userId) return "OWNER";

  const role = listing.teamMembers[0]?.role;
  if (role === "OWNER" || role === "MANAGER") return role;

  return null;
}

export async function assertListingAccess(
  userId: string,
  listingId: string,
  allowedRoles: ListingAccessRole[] = ["OWNER", "MANAGER"]
): Promise<ListingAccessRole> {
  const role = await getListingAccessRole(userId, listingId);
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }
  return role;
}

export async function getAccessibleListingIds(userId: string): Promise<string[]> {
  const listings = await db.listing.findMany({
    where: buildHostListingScope(userId),
    select: { id: true },
  });
  return listings.map((listing) => listing.id);
}
