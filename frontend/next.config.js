/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure static export behavior
  output: 'export',
  // Specify that auth pages should be server-side rendered
  // This tells Next.js not to include these pages in the static export
  exportPathMap: async function (defaultPathMap) {
    // Remove auth pages from static export
    delete defaultPathMap['/auth/login'];
    delete defaultPathMap['/auth/register'];
    return defaultPathMap;
  },
  // Keep the existing rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:8080/health',
      },
    ];
  },
};

module.exports = nextConfig;
