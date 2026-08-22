import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import '@helix-io/gallery/gallery.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fusionDisplay, fusionMono, fusionSans } from './fonts'
import { HelixElements } from './helix-elements'

export const metadata: Metadata = {
  description:
    'Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack that makes sovereignty practical.',
  title: {
    default: 'Fusion Development Group',
    template: '%s · Fusion',
  },
}

/**
 * Carries the token layers, the brand faces, and element registration.
 *
 * No chrome. The site and its tools want different frames: pages want a header
 * and a centered column, and a tool wants the whole viewport. Putting either
 * here would force the other to undo it, which is what route groups are for.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${fusionSans.variable} ${fusionMono.variable} ${fusionDisplay.variable}`}
      lang="en"
    >
      <body>
        <HelixElements />
        {children}
      </body>
    </html>
  )
}
