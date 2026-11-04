import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Nothing on this site is meant to be framed; this also protects the studio from clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const VERSIONED_MEDIA_CACHE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/video/:file(.*\\.v[0-9]+\\.(?:mp4|webm|jpg))",
        headers: [{ key: "Cache-Control", value: VERSIONED_MEDIA_CACHE }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/student", destination: "/students", permanent: true },
      { source: "/images/career-fair-hero.png", destination: "/images/career-fair-hero.webp", permanent: true },
      { source: "/student-:rest", destination: "/students", permanent: false },
      { source: "/recruiter-:rest", destination: "/recruiters", permanent: false },
    ];
  },
};

export default nextConfig;
