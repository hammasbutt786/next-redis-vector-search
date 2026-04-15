import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
  logging: {
    browserToTerminal: true,
  },
  transpilePackages: ["typesense-instantsearch-adapter"],
  allowedDevOrigins: ['immune-contract-bird-java.trycloudflare.com'],
  // cacheComponents: true,
};

export default nextConfig;
