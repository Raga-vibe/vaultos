/**
 * sitemap.xml
 *
 * Six public pages. `SITE_URL` is read from the environment because the
 * deployed origin is not knowable at build time; without it the sitemap is
 * still valid, just relative to localhost, and search engines will ignore it —
 * which is the right outcome for an unconfigured deployment.
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
    { url: `${base}/opportunities`, lastModified: now, priority: 0.8 },
    { url: `${base}/policy`, lastModified: now, priority: 0.8 },
    { url: `${base}/activity`, lastModified: now, priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
  ];
}
