import { findSitePage, sitePageSources } from '@fusion-io/site-content'
import { renderMdx } from '../../../lib/mdx'
import styles from './trust.module.css'

/**
 * The trust bar, rendered from `@fusion-io/site-content`.
 *
 * **The point is that it is finite.** `the internal plan` names the risk
 * this page exists to answer: a trust bar that is never defined can never be
 * met, and perpetual pre-launch is what happens to a company that keeps raising
 * one. Written down and counted, it converts an internal gate that can be moved
 * forever into a public commitment that can actually be reached.
 *
 * The six are `##` headings in the file rather than an array of six objects,
 * which is the same count expressed in the form a person adding a seventh would
 * actually be editing. The numbering is a CSS counter for the same reason: the
 * count is a fact about the document, so the document should carry it.
 *
 * The second half is the part most companies leave out and the reason this page
 * is worth having at all: none of it has been exercised yet, because nothing
 * has shipped. Saying so is the same discipline the stage labels are.
 */
const page = findSitePage('/trust')

export const metadata = { description: page?.description, title: 'Trust' }

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <>
      {/* One band, because it is one document. The hero and the prose under it
          were two, which put a whole band ofspace between a title and its
          own first sentence. */}
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            {page.kicker}
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {page.title}
          </helix-text>
          <div className={styles.prose} data-measure data-prose>
            {source ? await renderMdx(source) : null}
          </div>
        </helix-flex>
      </section>
    </>
  )
}
