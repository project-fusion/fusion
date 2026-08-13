import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HelixElements } from './helix-elements'

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
        {children}
      </body>
    </html>
  )
}
