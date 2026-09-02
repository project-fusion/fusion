import type { ReactNode } from 'react'
import { HelixElements } from '@/components/helix-elements/helix-elements'
import { RevealOnScroll } from '@/components/reveal-on-scroll/reveal-on-scroll'
import { SiteFooter } from '@/components/site-footer/site-footer'
import { SiteNav } from '@/components/site-nav/site-nav'
import { type RouteKind, routes } from '../../content/routes/routes'

/** The registry's routes of one kind, as palette items. */
const findable = (kind: RouteKind) =>
  routes()
    .filter((route) => route.kind === kind)
    .map((route) => ({ description: route.description, href: route.path, label: route.title }))

/**
 * Header, content column, and footer: everything except the tools.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Registered here rather than in the root layout, which is an ancestor of
          the spec runner and cannot register anything without giving that page
          two copies of the library. */}
      <HelixElements />
      {/*
       * *Built here, on the server, and handed down.** The registry reads the
       *           manifest off disk and holds the whole of the writing: it belongs to a
       *           server component, and a palette that imported it would pull the
       *           manifest into the client bundle to display a list of names. What
       *           crosses is the list.
       *
       * *`Route.description` is the caption**, which is what its own comment
       *           says it is for: `llms.txt` *and a search result*. Matching is still on
       *           the title, so what somebody types is measured against the name rather
       *           than against prose about it.
       */}
      <SiteNav
        findable={[
          { group: 'Components', items: findable('component') },
          { group: 'Documentation', items: findable('doc') },
          { group: 'Writing', items: findable('insight') },
        ]}
      />
      <main style={{ viewTransitionName: 'site-content' }}>{children}</main>
      <RevealOnScroll />

      <SiteFooter />
    </>
  )
}
