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
  // Tell Next.js to output to the 'out' directory
  distDir: 'out',
};

module.exports = nextConfig;
