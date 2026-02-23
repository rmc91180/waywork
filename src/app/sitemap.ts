import { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Force dynamic rendering — never prerender during build
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waywork.co";

  let listings: { id: string; updatedAt: Date }[] = [];
  try {
    listings = await db.listing.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
    });
  } catch {
    // DB unavailable during build — return static entries only
  }

  const listingUrls = listings.map((listing) => ({
    url: `${baseUrl}/spaces/${listing.id}`,
    lastModified: listing.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...listingUrls,
  ];
}
