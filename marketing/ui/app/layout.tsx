import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { FusionLogo } from './fusion-logo'
import { HelixElements } from './helix-elements'
import { SiteNav } from './site-nav'

export const metadata: Metadata = {
  description:
    'Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack that makes sovereignty practical.',
  title: 'Fusion Development Group',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HelixElements />

        <SiteNav />

        <main>{children}</main>

        <footer className="siteFooter">
          <helix-flex class="shell" direction="column" gap="lg">
            <helix-divider></helix-divider>
            <helix-flex align="center" gap="md" justify="between" wrap>
              <helix-flex align="center" gap="xs">
                <FusionLogo size="1.25rem" />
                <helix-text size="sm" tone="muted">
                  Fusion Development Group
                </helix-text>
              </helix-flex>
              <helix-text size="xs" tone="subtle">
                Developing for humanity.
              </helix-text>
            </helix-flex>
          </helix-flex>
        </footer>
      </body>
    </html>
  )
}
