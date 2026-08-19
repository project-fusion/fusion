import type { ReactNode } from 'react'
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
      <SiteNav />
      <main style={{ viewTransitionName: 'site-content' }}>{children}</main>

      <footer className="siteFooter">
        <helix-flex align="center" class="shell" gap="md" justify="between" wrap>
          <helix-flex align="center" gap="xs">
            <helix-icon
              className="fusionLogo"
              label="Fusion"
              name="fusion"
              style={{ '--icon-size': '1.25rem' }}
            />
            <helix-text appearance="caption" tone="muted">
              Fusion Development Group
            </helix-text>
          </helix-flex>
          <helix-text appearance="label" tone="subtle">
            Developing for humanity.
          </helix-text>
        </helix-flex>
      </footer>
    </>
  )
}
