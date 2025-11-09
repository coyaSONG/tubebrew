import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com', // YouTube channel avatars
      },
    ],
  },
  // Transpile workspace packages for monorepo deployment
  transpilePackages: [
    '@tubebrew/ai',
    '@tubebrew/db',
    '@tubebrew/types',
    '@tubebrew/youtube',
  ],
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
