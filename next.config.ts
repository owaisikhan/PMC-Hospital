import type { NextConfig } from "next";

// Deliberately no `output: "standalone"`: that shape is for Docker/self-hosting,
// where a container needs a self-contained server with no host node_modules.
// Vercel does its own build tracing and expects the default output — standalone
// skips the file that step looks for, so the build fails with
// "ENOENT: .next/next-server.js.nft.json" after an otherwise clean compile.
const nextConfig: NextConfig = {
  experimental: {
    // Every page here reads live data, so by default the browser keeps none
    // of them: switching back to a tab you left seconds ago rebuilt it on the
    // server every time. Now a page you have visited is reused for 30 s, and
    // one the page tabs prefetched (see SlidingTabs) for 60 s.
    //
    // Nothing goes stale after a change made here: every save goes through a
    // server action that calls revalidatePath, which empties this cache
    // entirely. What these windows allow is up to 30-60 s before a change made
    // on another device shows on this one - the same as a page left open.
    staleTimes: {
      dynamic: 30,
      static: 60,
    },
  },
};

export default nextConfig;
