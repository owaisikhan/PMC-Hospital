import type { NextConfig } from "next";

// Deliberately no `output: "standalone"`: that shape is for Docker/self-hosting,
// where a container needs a self-contained server with no host node_modules.
// Vercel does its own build tracing and expects the default output — standalone
// skips the file that step looks for, so the build fails with
// "ENOENT: .next/next-server.js.nft.json" after an otherwise clean compile.
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
