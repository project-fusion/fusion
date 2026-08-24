import { findSitePage, sitePageSources } from '@fusion-io/site-content'
import { renderMdx } from '../../../lib/mdx'
import { DocumentPage } from '../document-page'

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
 *
 * **It takes the shared document shell**, which is 206's finding: this page,
 * Trust and an insight are the same kind of thing, a single sustained argument,
 * and the insight page had already worked the layout out. Carrying a layout of
 * its own meant the measure, the heading scale and the block rhythm differed
 * between three pages a reader reads identically.
 */
const page = findSitePage('/thesis')

export const metadata = { description: page?.description, title: 'Thesis' }

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <DocumentPage
      body={source ? await renderMdx(source) : null}
      kicker={page.kicker}
      lede={page.lede}
      title={page.title}
    />
  )
}
