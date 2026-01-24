import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shreddingsassy.com',
      },
    ],
  },
};

export default nextConfig;
