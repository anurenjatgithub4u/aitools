import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server runtime, not static export: route handlers call OpenAI and iTunes with server-only keys.
  // The libSQL client loads a native module for local files; keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql", "firebase-admin"],
  // The app applies ./drizzle migrations at runtime; make sure Vercel ships those files.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  // several lockfiles live above this folder; pin the root so Turbopack watches only this app
  turbopack: { root: __dirname },
};

export default nextConfig;
