import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel's comment toolbar runs on preview deployments only.
const isPreview = process.env.VERCEL_ENV === "preview";
const turnstile = "https://challenges.cloudflare.com";
const vercelLive = isPreview ? " https://vercel.live" : "";

/**
 * Content security policy. 'unsafe-inline' for scripts is needed by Next.js's inline
 * bootstrapping without per-request nonces (which would stop pages being cached).
 * blob: frames are the letter preview; 'self' frames are the admin PDF view.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${turnstile}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${turnstile}${vercelLive}`,
  `frame-src 'self' blob: ${turnstile}${vercelLive}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // MP thumbnails from the UK Parliament Members API (fetched by the server, not the browser).
    remotePatterns: [{ protocol: "https", hostname: "members-api.parliament.uk", pathname: "/api/Members/**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Keep admin and confirmation pages out of search engines.
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/letters/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
