import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  description:
    'Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack that makes sovereignty practical.',
  title: 'Fusion Development Group',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
