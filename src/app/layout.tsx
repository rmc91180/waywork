import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WayWork - Work-Verified Remote Workspaces",
    template: "%s | WayWork",
  },
  description: "Find and book work-verified remote workspaces. Every space is rated on WiFi speed, desk setup, quietness, and more.",
  keywords: ["remote work", "coworking", "workspace", "work from anywhere", "digital nomad", "office rental"],
  openGraph: {
    type: "website",
    siteName: "WayWork",
    title: "WayWork - Work-Verified Remote Workspaces",
    description: "Find and book work-verified remote workspaces with verified WiFi and amenities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${plusJakartaSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
