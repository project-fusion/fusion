import '@helix-io/styles/primitives.css'
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import './site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HelixElements } from './helix-elements'
import { Sidebar } from './sidebar'

export const metadata: Metadata = {
  description: 'Component sandbox and API reference for Helix.',
  title: 'Helix Sandbox',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HelixElements />
        <div className="shell">
          <Sidebar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
