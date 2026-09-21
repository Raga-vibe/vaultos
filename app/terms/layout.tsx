/**
 * Public shell for /terms.
 *
 * The legal pages belong to the public side of the site, not the workspace,
 * so they wear the same thin header and footer the landing page does.
 */

import { SiteShell } from "../../components/shell/SiteShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
