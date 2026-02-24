import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ListingCard } from "@/components/listings/listing-card";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!user) return { title: "User Not Found" };
  return { title: user.name || "User Profile" };
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      role: true,
      linkedinUrl: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  // If host, fetch their active listings and stats
  let listings: Array<{
    id: string;
    title: string;
    slug: string;
    workspaceType: string;
    city: string;
    state: string | null;
    country: string;
    pricePerDay: number;
    cleaningFee: number;
    maxGuests: number;
    bedroomCount: number;
    bedSize: string;
    propertySizeSqm: number | null;
    workScore: number;
    hasJacuzzi: boolean;
    hasSwimmingPool: boolean;
    hasBackyard: boolean;
    hasPingPongTable: boolean;
    hasPoolTable: boolean;
    averageRating: number | null;
    reviewCount: number;
    images: { url: string; alt: string | null }[];
    connectivityProfile: {
      declaredDownloadMbps: number;
      networkType: string;
      verified: boolean;
    } | null;
    host: { name: string | null; image: string | null };
    _count: { reviews: number };
  }> = [];

  let totalReviews = 0;
  let avgRating: string | null = null;

  if (user.role === "HOST") {
    listings = await db.listing.findMany({
      where: { hostId: user.id, status: "ACTIVE" },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        connectivityProfile: {
          select: {
            declaredDownloadMbps: true,
            networkType: true,
            verified: true,
          },
        },
        host: { select: { name: true, image: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { workScore: "desc" },
    });

    totalReviews = listings.reduce((sum, l) => sum + l._count.reviews, 0);

    const ratedListings = listings.filter(
      (l) => l.averageRating !== null && l.averageRating !== undefined
    );
    if (ratedListings.length > 0) {
      const totalRating = ratedListings.reduce(
        (sum, l) => sum + (l.averageRating || 0),
        0
      );
      avgRating = (totalRating / ratedListings.length).toFixed(1);
    }
  }

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || "User"}
              />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">
                  {user.name || "WayWork User"}
                </h1>
                <Badge
                  variant={
                    user.role === "HOST"
                      ? "default"
                      : user.role === "ADMIN"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {user.role}
                </Badge>
              </div>

              {user.bio && (
                <p className="text-gray-600 mb-3">{user.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>
                  Member since{" "}
                  {format(new Date(user.createdAt), "MMMM yyyy")}
                </span>
                {user.linkedinUrl && (
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>

              {/* Host Stats */}
              {user.role === "HOST" && (
                <div className="flex gap-6 mt-4">
                  <div>
                    <p className="text-xl font-bold">{listings.length}</p>
                    <p className="text-xs text-gray-500">
                      Active Listing{listings.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{totalReviews}</p>
                    <p className="text-xs text-gray-500">
                      Review{totalReviews !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {avgRating && (
                    <div>
                      <p className="text-xl font-bold">{avgRating}</p>
                      <p className="text-xs text-gray-500">Avg Rating</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Host Listings */}
      {user.role === "HOST" && listings.length > 0 && (
        <>
          <Separator className="mb-6" />
          <h2 className="text-xl font-semibold mb-4">
            {user.name ? `${user.name}'s` : "Their"} Spaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
