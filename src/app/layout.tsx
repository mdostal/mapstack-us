import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Stacked-layers mark -- the app's own core UX metaphor (add a layer, stack
// as many as you want) -- in a distinct blue, on a dark rounded square.
// Real files under public/ (favicon.ico/.svg, apple-touch-icon.png) rendered
// from this same design, replacing the old data-URI-only favicon so the tab
// icon is a real cacheable asset rather than an inline string on every page.
// basePath isn't auto-applied to metadata.icons string paths (only to
// <Link>/<Image>/router navigation -- see next.config.ts's own comment on
// this exact gap), so it's prefixed explicitly here, same as
// NEXT_PUBLIC_BASE_PATH's other client-side use in lib/db/client.ts.
const BASE_PATH = process.env.E2E_NO_BASE_PATH ? "" : "/mapstack";

export const metadata: Metadata = {
  title: "Mapstack",
  description: "Open-source US map layers -- pick datasets, overlay them, find what matters to you.",
  icons: {
    icon: [
      { url: `${BASE_PATH}/favicon.ico`, sizes: "any" },
      { url: `${BASE_PATH}/favicon.svg`, type: "image/svg+xml" },
    ],
    apple: `${BASE_PATH}/apple-touch-icon.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
