import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For @cloudflare/next-on-pages - don't use "export" for dynamic apps
  // images: {
  //   unoptimized: true,  // Only needed if using output: "export"
  // },
  // Cloudflare-specific config
  trailingSlash: true,
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@vercel/og': false,
    };
    return config;
  },
};

export default nextConfig;
