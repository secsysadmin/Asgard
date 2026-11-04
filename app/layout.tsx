import type { Metadata, Viewport } from "next";
import { DM_Mono, IBM_Plex_Sans, Playfair_Display, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

export const revalidate = 300;

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

const THEME_COLOR = "#500000";

const heroDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal"],
  variable: "--font-hero-display",
  display: "swap",
});
const heroSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-hero-sans",
  display: "swap",
});
const display = Source_Serif_4({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal"],
  variable: "--font-display",
  display: "swap",
});
const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "SEC Engineering Career Fair | Texas A&M",
  description: "Texas A&M Student Engineers’ Council Engineering Career Fair",
};

export const viewport: Viewport = { themeColor: THEME_COLOR };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${heroDisplay.variable} ${heroSans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
