import type { ReactNode } from 'react'

/** Header and centred column for the landing page and the API reference. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <helix-app-header>
        <helix-link appearance="quiet" href="/" slot="brand">
          Helix
        </helix-link>
        <helix-link appearance="quiet" href="/components/button">
          Components
        </helix-link>
        <helix-button appearance="primary" href="/sandbox" size="sm" slot="actions">
          Open sandbox
        </helix-button>
      </helix-app-header>
      <main className="siteMain">{children}</main>
    </>
  )
}
