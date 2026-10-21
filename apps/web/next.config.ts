import type { NextConfig } from 'next';

const apiInternal = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** Extra image hosts (comma separated), e.g. an S3 bucket domain. */
const extraImageHosts = (process.env.IMAGE_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const config: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone; `next start` (PM2, CI) uses the default output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@nexus/shared'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: 'http' as const, hostname: 'localhost', port: '4000' }]
        : []),
      ...extraImageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
  // Same-origin API in every environment: the browser calls /api/v1/*, which is
  // proxied here in development and by Nginx in production (Nginx wins there).
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${apiInternal}/api/v1/:path*` },
      { source: '/uploads/:path*', destination: `${apiInternal}/uploads/:path*` },
    ];
  },
  // Old rental-only URLs keep working after the move to Buy / Rent.
  async redirects() {
    return [
      { source: '/rentals', destination: '/locations', permanent: true },
      { source: '/rentals/:city', destination: '/rent/:city', permanent: true },
      { source: '/rentals/:city/:locality', destination: '/rent/:city/:locality', permanent: true },
      { source: '/residential', destination: '/properties?category=residential', permanent: true },
      { source: '/list-your-property', destination: '/post-property', permanent: true },
      {
        source: '/admin/submissions',
        destination: '/admin/properties?status=pending',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default config;
