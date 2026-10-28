import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server runtime, not static export: route handlers call OpenAI and iTunes with server-only keys.
  // better-sqlite3 is a native module; keep it out of the bundle.
  serverExternalPackages: ["better-sqlite3"],
  // several lockfiles live above this folder; pin the root so Turbopack watches only this app
  turbopack: { root: __dirname },
};

export default nextConfig;
