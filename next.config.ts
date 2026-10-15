import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: "/student", destination: "/students", permanent: true },
      { source: "/student-:rest", destination: "/students", permanent: false },
      { source: "/recruiter-:rest", destination: "/recruiters", permanent: false },
    ];
  },
};

export default nextConfig;
