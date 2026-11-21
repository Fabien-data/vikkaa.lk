import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Photo uploads go through server actions; nginx allows 50 MB too.
    serverActions: { bodySizeLimit: '50mb' },
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
