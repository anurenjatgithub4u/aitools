import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["172.20.10.8"],
  // pdfjs-dist (used by pdf-parse for resume text extraction) loads a
  // pdf.worker.mjs file at runtime. Bundling it with Turbopack/webpack
  // breaks that path resolution ("Setting up fake worker failed: Cannot
  // find module '.../pdf.worker.mjs'") — excluding it from bundling lets
  // it resolve normally through node_modules at request time instead.
  serverExternalPackages: ["pdfjs-dist", "pdf-parse", "mupdf"],

  // Permanent redirects for renamed routes. Kept even for URLs that were never
  // widely shared: a 301 costs nothing, and a slug that 404s after a rename is
  // the kind of thing nobody notices until a link somewhere breaks.
  async redirects() {
    return [
      {
        source: "/utilities/youtube-to-knowledge",
        destination: "/utilities/youtube-summarizer",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
