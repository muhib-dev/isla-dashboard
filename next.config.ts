import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Partner flyers for /promo-offers are hosted in the ISLA WordPress media library.
    remotePatterns: [new URL("https://theisla.org/wp-content/uploads/**")],
  },
  async redirects() {
    // The list + map directory was folded into /map; keep old links (and their search) working.
    return [{ source: "/directory", destination: "/map", permanent: true }]
  },
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
