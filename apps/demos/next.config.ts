import type { NextConfig } from 'next';

// Static site: the kits run in the visitor's browser (see lib/*-runtime.ts).
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  // the kits ship TypeScript source
  transpilePackages: ['@agentkit.ch/shopkit', '@agentkit.ch/subkit'],
  images: { unoptimized: true },
};

export default nextConfig;
