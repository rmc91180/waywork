import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waywork.co";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/host/", "/account", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
