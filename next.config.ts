import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Photo uploads go through server actions; nginx allows 50 MB too.
    serverActions: { bodySizeLimit: '50mb' },
    // The proxy buffers request bodies before actions see them (default 10 MB, then silently cut off).
    proxyClientMaxBodySize: '50mb',
    // forbidden() gives expired signing/portal links a real 403.
    authInterrupts: true,
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
