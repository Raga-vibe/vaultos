/**
 * robots.txt
 *
 * The four product pages are fine to index. The API is not: those routes read
 * a live wallet and evaluate policy on every request, so a crawler walking
 * them would burn RPC calls and fill the audit trail with requests nobody
 * made.
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
  };
}
