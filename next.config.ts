import type { NextConfig } from 'next';

// Static export: parsing, querying and charting all happen in the browser,
// so ./out can be served by any static host. Set BASE_PATH only for sub-path hosting.
const basePath = process.env.BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
