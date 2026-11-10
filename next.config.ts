import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirect the dead legacy /listings/:id route to the canonical /homestays/:id route.
  // Any external link to /listings/... is cleanly forwarded without a 404.
  async redirects() {
    return [
      {
        source: "/listings/:listingId",
        destination: "/homestays/:listingId",
        permanent: true, // 308 — tells search engines and browsers to update bookmarks
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
};

export default nextConfig;
