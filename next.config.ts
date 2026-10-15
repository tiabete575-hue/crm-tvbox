import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: { cpus: 1, webpackBuildWorker: true },
};

export default nextConfig;
