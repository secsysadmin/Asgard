import type { Metadata, Viewport } from "next";
import { DM_Mono, IBM_Plex_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

const THEME_COLOR = "#500000";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
