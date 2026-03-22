import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.197", "localhost", "127.0.0.1"],
};

export default nextConfig;
