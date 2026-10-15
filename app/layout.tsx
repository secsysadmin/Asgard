import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEC Engineering Career Fair | Texas A&M",
  description: "Texas A&M Student Engineers’ Council Engineering Career Fair",
};

export const viewport: Viewport = { themeColor: "#500000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
