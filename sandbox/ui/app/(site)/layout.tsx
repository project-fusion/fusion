import Link from 'next/link'
import type { ReactNode } from 'react'

/** Header and centred column for the landing page and the API reference. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <helix-app-header>
        <Link href="/" slot="brand">
          Helix
        </Link>
        <Link href="/components/button">Components</Link>
        {/* `href` on the button, not a `<Link>` inside it. Nesting an anchor
            in a button is invalid HTML, and the anchor takes the base layer's
            link colour, which on a primary button is blue text on blue. */}
        <helix-button appearance="primary" href="/sandbox" size="sm" slot="actions">
          Open sandbox
        </helix-button>
      </helix-app-header>
      <main className="siteMain">{children}</main>
    </>
  )
}
