import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

/* Every layer in one import: the tokens, the reset, the utility layer, and the
   `:not(:defined)` rules that keep a tag from arriving unstyled. */
import '@fusion.dev/helix-styles/helix.css'

import { HelixElements } from './helix-elements.js'

export const metadata: Metadata = { title: '__PROJECT_NAME__' }
export const viewport: Viewport = { initialScale: 1, width: 'device-width' }

/**
 * `HelixElements` is rendered once, here, and returns `null`.
 *
 * A custom element registers as a side effect of importing its module, and that
 * import has to be in the *client* graph to ever run: a server component's
 * imports do not ship to the browser. One client component holds them all.
 *
 * Pages stay server components. An unregistered tag is only an unknown element in
 * the HTML, which upgrades the moment the definition lands, so nothing here asks
 * you to mark a page `'use client'` to use a button.
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
