import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waywork.com";
  return {
    rules: [
      {
        // Standard crawlers + AI search bots — allow all public pages
        userAgent: "*",
        allow: ["/", "/search", "/spaces/", "/cities/", "/for-teams", "/about", "/blog", "/support"],
        disallow: ["/admin/", "/host/", "/account", "/api/", "/bookings/"],
      },
      {
        // GPTBot (ChatGPT / OpenAI) — explicitly allowed
        userAgent: "GPTBot",
        allow: ["/", "/search", "/spaces/", "/cities/", "/for-teams", "/about", "/blog"],
        disallow: ["/admin/", "/host/", "/account", "/api/", "/bookings/"],
      },
      {
        // ClaudeBot (Anthropic) — explicitly allowed
        userAgent: "ClaudeBot",
        allow: ["/", "/search", "/spaces/", "/cities/", "/for-teams", "/about", "/blog"],
        disallow: ["/admin/", "/host/", "/account", "/api/", "/bookings/"],
      },
      {
        // PerplexityBot — explicitly allowed
        userAgent: "PerplexityBot",
        allow: ["/", "/search", "/spaces/", "/cities/", "/for-teams", "/about", "/blog"],
        disallow: ["/admin/", "/host/", "/account", "/api/", "/bookings/"],
      },
      {
        // Googlebot-Extended (AI Overviews / SGE)
        userAgent: "Google-Extended",
        allow: ["/", "/search", "/spaces/", "/cities/", "/for-teams", "/about", "/blog"],
        disallow: [],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
