import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore ESLint and TypeScript errors during Vercel build
  // (we check these in CI separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Serverless function timeout (Pro plan: 60s, Hobby: 10s)
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
