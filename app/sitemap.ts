/**
 * sitemap.xml
 *
 * The public pages, plus the workspace entry point.
 *
 * The workspace's inner screens are deliberately absent. /app/opportunities
 * and /app/activity read a live wallet and evaluate policy on every request,
 * so inviting a crawler through them would burn RPC calls and write audit
 * records nobody asked for — the same reason robots.txt disallows /api.
 *
 * `SITE_URL` is read from the environment because the deployed origin is not
 * knowable at build time; without it the sitemap is still valid, just relative
 * to localhost, and search engines will ignore it — which is the right outcome
 * for an unconfigured deployment.
 */

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/about`, lastModified: now, priority: 0.8 },
    { url: `${base}/app`, lastModified: now, priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
  ];
}
