import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // List and Export became one Library page.
  async redirects() {
    return [
      { source: '/list', destination: '/library', permanent: true },
      { source: '/export', destination: '/library', permanent: true },
    ];
  },
};

export default nextConfig;
