import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WayWork - Work-Verified Offsite Spaces",
    template: "%s | WayWork",
  },
  description:
    "Find and book work-verified spaces for focused productivity and small-team collaboration. Guaranteed connectivity, real desks, and verified work readiness.",
  keywords: [
    "coworking",
    "offsite",
    "remote work",
    "workspace",
    "work from anywhere",
    "team offsite",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
