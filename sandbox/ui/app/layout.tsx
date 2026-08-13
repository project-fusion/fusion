import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HelixElements } from './helix-elements'

export const metadata: Metadata = {
  description: 'Component sandbox and API reference for Helix.',
  title: 'Helix',
}

/**
 * Carries the token layers and element registration, and no chrome.
 *
 * The two route groups want different frames: the site has a header and a
 * scrolling column, the sandbox owns the whole viewport. Putting either here
 * would force the other to undo it.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HelixElements />
        {children}
      </body>
    </html>
  )
}
