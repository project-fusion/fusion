import type { ReactNode } from 'react'
import { FusionLogo } from '../fusion-logo'
import { SiteNav } from '../site-nav'

/** Header, content column, and footer: everything except the tools. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>

      <footer className="siteFooter">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-divider></helix-divider>
          <helix-flex align="center" gap="md" justify="between" wrap>
            <helix-flex align="center" gap="xs">
              <FusionLogo size="1.25rem" />
              <helix-text appearance="caption" tone="muted">
                Fusion Development Group
              </helix-text>
            </helix-flex>
            <helix-text appearance="label" tone="subtle">
              Developing for humanity.
            </helix-text>
          </helix-flex>
        </helix-flex>
      </footer>
    </>
  )
}
