/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export configuration
  output: 'export',
  // Disable image optimization which is incompatible with export
  images: {
    unoptimized: true,
  },
  // Use trailing slash for better static hosting compatibility
  trailingSlash: true,
  // Skip generating auth pages statically - they'll use client-side navigation only
  experimental: {
    // This enables appDir but skips specific routes during static generation
    appDir: true,
  },
  // Tell Next.js to exclude certain patterns from static generation
  distDir: 'out',
};

module.exports = nextConfig;
