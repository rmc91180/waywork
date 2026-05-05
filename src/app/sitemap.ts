import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { CITY_SLUGS } from "@/lib/cities";

export const revalidate = 3600; // Regenerate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waywork.com";
  const now = new Date();

  let listings: { id: string; updatedAt: Date }[] = [];
  try {
    listings = await db.listing.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
    });
  } catch {
    // DB unavailable during build — return static entries only
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${baseUrl}/cities`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/for-teams`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.65 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const cityPages: MetadataRoute.Sitemap = CITY_SLUGS.map((slug) => ({
    url: `${baseUrl}/cities/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${baseUrl}/spaces/${listing.id}`,
    lastModified: listing.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...listingPages];
}
