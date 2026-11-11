import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Baseline security headers on every response. No Content-Security-Policy
  // yet: the boot guard is an inline script and Turnstile loads from
  // Cloudflare, so a CSP needs nonces first.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  experimental: {
    /* Image uploads post through Server Actions, which refuse bodies over
       1 MB by default. A resized cover is far smaller; this is for the
       original a browser without JavaScript (or without a working canvas
       encoder) sends. Vercel caps a function's request body at 4.5 MB. */
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
