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
// as many as you want) -- in a distinct blue, on a dark rounded square,
// matching the data-URI favicon pattern already shipped for
// tools.mdostal.com and allergy-locator (no binary .ico generation needed).
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230a0a0a'/%3E%3Cpolygon points='50,20 80,37 50,54 20,37' fill='%2360a5fa'/%3E%3Cpolygon points='50,42 80,59 50,76 20,59' fill='%232563eb'/%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: "Mapstack",
  description: "Open-source US map layers -- pick datasets, overlay them, find what matters to you.",
  icons: { icon: FAVICON },
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
