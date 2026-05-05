import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { BRAND } from "@/lib/brand";

// DM Sans — humanist, warm, excellent on screens, not Inter-generic
const dmSans = DM_Sans({
  variable: "--font-inter", // keep var name for compatibility
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Playfair Display — editorial serif for headings
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// DM Mono — for prices, scores, numbers — adds craft
const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${BRAND.name}: ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Way Work helps guests and teams book work-ready residential apartments worldwide — verified internet, desk setups, and Work Scores for every listing. Book solo workations or full team offsites.",
  keywords: [
    "workation",
    "work from home rental",
    "digital nomad apartment",
    "team offsite accommodation",
    "remote workspace rental",
    "work ready apartment",
    "verified internet rental",
    "work travel accommodation",
    "company offsite booking",
    "coliving workspace",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.guestValueProp,
    url: APP_URL,
    images: [{ url: `${APP_URL}/images/og-default.png`, width: 1200, height: 630, alt: "Way Work — Work-ready homes worldwide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.guestValueProp,
  },
  alternates: { canonical: APP_URL },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfairDisplay.variable} ${dmMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
