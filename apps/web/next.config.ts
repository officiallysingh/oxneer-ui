import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Workspace packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ['@oxneer/api', '@oxneer/ui'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8090',
        pathname: '/api/v1/blobs/**',
      },
    ],
  },
};

export default nextConfig;
