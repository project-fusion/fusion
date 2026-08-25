import type { ReactNode } from 'react'
import { SiteNav } from '@/components/site-nav/site-nav'
import styles from '../../components/chrome.module.css'
import { type RouteKind, routes } from '../../content/routes/routes'

/** The registry's routes of one kind, as palette items. */
const findable = (kind: RouteKind) =>
  routes()
    .filter((route) => route.kind === kind)
    .map((route) => ({ description: route.description, href: route.path, label: route.title }))

/**
 * Header, content column, and footer: everything except the tools.
 *
 * The header and footer run the full width of the viewport and are inset by
 * `space-2xl` rather than by the page's own `--site-inset`, so the wordmark and
 * the copyright start on the same line down the left edge. That clamp opens to
 * seven rem on a wide screen, which is right for a column of prose and wrong
 * for chrome: the two edges disagreed by 48 pixels at 1600 while this note said
 * they did not. The content column between them keeps the clamp.
 *
 * `view-transition-name` on the content is what makes a route change a
 * cross-fade of the middle of the page while the header and its indicator stay
 * put. The name has to be unique per document, which is why it is here on the
 * one main rather than on anything a page renders.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* **Built here, on the server, and handed down.** The registry reads the
          manifest off disk and holds the whole of the writing: it belongs to a
          server component, and a palette that imported it would pull the
          manifest into the client bundle to display a list of names. What
          crosses is the list.

          **From `routes()` rather than from three hand-picked arrays**, which
          is why the documentation is in here at all. This passed the families
          and the insights and nothing else, so all 43 documentation pages were
          unreachable from the palette: a reader who typed "installation" got
          nothing, on a site whose largest section is documentation. The
          registry already knew about them, `check:routes` counting 89
          component, 43 doc, 6 insight and 15 page, and it is the same list the
          sitemap and `llms.txt` are built from. A fourth copy of it here would
          have drifted the same way the third one did.

          **`Route.description` is now the caption**, which is what its own
          comment always said it was for: `llms.txt` *and a search result*. It
          waited on `Findable` having somewhere to put it, and `Option` having
          somewhere to draw it, and as of 25 Aug 2026 both are true. Matching is
          still on the title, so what somebody types is measured against the
          name rather than against prose about it. */}
      <SiteNav
        findable={[
          { group: 'Components', items: findable('component') },
          { group: 'Documentation', items: findable('doc') },
          { group: 'Writing', items: findable('insight') },
        ]}
      />
      <main style={{ viewTransitionName: 'site-content' }}>{children}</main>

      <footer className={styles.siteFooter} data-site-footer>
        <helix-flex align="center" data-shell gap="md" justify="between" wrap>
          <helix-flex align="center" gap="xs">
            <helix-icon
              className={styles.fusionLogo}
              label="Fusion"
              name="fusion"
              style={{ '--icon-size': '1.25rem' }}
            />
            <helix-text tone="muted" variant="caption">
              Fusion Development Group
            </helix-text>
          </helix-flex>
          <helix-text tone="subtle" variant="label">
            Developing for humanity.
          </helix-text>
        </helix-flex>
      </footer>
    </>
  )
}
