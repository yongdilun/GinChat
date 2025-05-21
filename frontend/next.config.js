/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep output: 'export' for Render hosting
  output: 'export',
  // Disable image optimization which is incompatible with export
  images: {
    unoptimized: true,
  },
  // Tell Next.js to exclude auth pages from static generation
  // This also prevents pre-rendering errors with client components
  // that use browser APIs like localStorage
  trailingSlash: true,
};

module.exports = nextConfig;
