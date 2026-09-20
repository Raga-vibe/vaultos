import type { NextConfig } from "next";

/**
 * serverExternalPackages is required.
 *
 * @coinbase/agentkit and the CDP SDKs are CommonJS and pull in a very large
 * transitive tree. Without this, the Next 16 build fails during page-data
 * collection with "TypeError: Z is not a function" — the bundler mangles a
 * CJS interop shim it should have left alone.
 */
const serverExternalPackages = [
  "@coinbase/agentkit",
  "@coinbase/cdp-sdk",
  "@coinbase/coinbase-sdk",
];

/**
 * Security headers.
 *
 * HSTS is production-only on purpose. A browser that receives it over
 * localhost caches the rule and then refuses plain HTTP to localhost for
 * every other project on the machine — a genuinely annoying, hard-to-diagnose
 * side effect of a header meant to help.
 *
 * Redirecting HTTP to HTTPS is not done here because the application cannot
 * do it reliably: behind a proxy it never sees the original scheme. Vercel,
 * Netlify, Fly and Cloudflare all redirect at the edge already. HSTS is the
 * part the application itself can contribute — it tells the browser never to
 * try plain HTTP again.
 *
 * No Content-Security-Policy yet. Next injects inline bootstrap scripts, so a
 * strict policy needs per-request nonces and middleware. Adding a loose CSP
 * instead would look like protection while providing very little, so the
 * honest position is to leave it off and say so.
 */
const securityHeaders = [
  // Stops a response being reinterpreted as a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak a full URL to another origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Clickjacking: this app should never be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Hardware and sensors are never used.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The API reads a live wallet on every call. Nothing about it should
        // ever be cached by a browser, a proxy or a CDN.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
