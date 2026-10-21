import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages removed when lost reports moved to the Info Desk; keep old links working.
  async redirects() {
    return [
      { source: "/report", destination: "/#how-it-works", permanent: false },
      { source: "/my-reports", destination: "/#how-it-works", permanent: false },
      { source: "/team/not-authorized", destination: "/denied", permanent: false },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
