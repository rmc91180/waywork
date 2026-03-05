import type { NextConfig } from "next";

const configuredCpus = Number.parseInt(process.env.NEXT_BUILD_CPUS || "", 10);

const nextConfig: NextConfig = {
  experimental: {
    cpus: Number.isFinite(configuredCpus) ? configuredCpus : 1,
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
