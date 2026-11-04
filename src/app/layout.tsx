import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { validateRequiredEnv } from "@/lib/env";
import "./globals.css";

if (process.env.NEXT_RUNTIME !== "edge") {
  validateRequiredEnv([
    "NEXT_PUBLIC_APP_URL",
    "DATABASE_URL",
  ]);
}

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Linq — Event Registration & Attendee Management Platform",
  description:
    "Linq helps organizations and event creators manage event registration, issue scannable attendee cards, track event attendance and bring people together.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmMono.variable} font-sans scroll-smooth`}
    >
      <body suppressHydrationWarning className={dmSans.className}>
        <Toaster position="top-center" richColors />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
