import { findSitePage, sitePageSources } from '@fusion-io/site-content'
import { renderMdx } from '../../../lib/mdx'
import styles from './thesis.module.css'

/**
 * The thesis, rendered from `@fusion-io/site-content`.
 *
 * **The prose is a flat MDX file and this is a frame around it.** It was three
 * TypeScript arrays and a page of JSX before, which meant the layers, the
 * ladder and the reasons were data structures and the sentences between them
 * were `<helix-text>` children. Neither is a thing anybody wants to write, and
 * the copy module that briefly replaced them was worse: one 358 character line
 * per paragraph.
 *
 * What is left here is the two things a document cannot carry: where it sits on
 * the page, and the hero above it. Everything else is in the file.
 */
const page = findSitePage('/thesis')

export const metadata = { description: page?.description, title: 'Thesis' }

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <>
      {/* One band, because it is one document. The hero and the prose under it
          were two bands, which put a whole band of space between a title and
          its own first sentence. */}
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
