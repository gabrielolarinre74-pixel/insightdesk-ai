import type { NextConfig } from 'next';

// Static export: parsing, querying and charting all happen in the browser,
// so InsightDesk can be hosted on GitHub Pages. BASE_PATH is set by CI.
const basePath = process.env.BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
