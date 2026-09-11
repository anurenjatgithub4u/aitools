import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole site is client-rendered 3D worlds, no server needed.
  // Vercel serves the `out/` folder; works on any static host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // several lockfiles live above this folder; pin the root so Turbopack watches only this app
  turbopack: { root: __dirname },
};

export default nextConfig;
