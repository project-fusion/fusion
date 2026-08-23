import type { ReactNode } from 'react'
import { getFamilies } from '../../lib/catalog'
import { INSIGHTS } from '../../lib/insights'
import styles from '../chrome.module.css'
import { SiteNav } from '../site-nav'

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
      {/* **Built here, on the server, and handed down.** The catalog reads the
          manifest off disk and the insight registry is the whole of the
          writing: both belong to a server component, and a palette that
          imported them would pull the manifest into the client bundle to
          display a list of names. What crosses is the list. */}
      <SiteNav
        findable={[
          {
            group: 'Components',
            items: getFamilies().map((family) => ({
              href: `/helix/components/${family.slug}`,
              label: family.label,
            })),
          },
          {
            group: 'Writing',
            items: INSIGHTS.map((insight) => ({
              href: `/insights/${insight.slug}`,
              label: insight.title,
            })),
          },
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
