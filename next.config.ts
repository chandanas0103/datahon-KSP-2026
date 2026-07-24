import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: false,
  reactStrictMode: false,
  // Prevent redirect loops behind reverse proxies (space-z.ai / Cloudflare, etc.)
  skipTrailingSlashRedirect: true,
  // Disable asset/TS/JS redirects that proxies can echo back in loops
  async redirects() {
    return [];
  },
};

export default nextConfig;
