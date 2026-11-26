import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // MP thumbnails from the UK Parliament Members API.
    remotePatterns: [{ protocol: "https", hostname: "members-api.parliament.uk", pathname: "/api/Members/**" }],
  },
};

export default nextConfig;
