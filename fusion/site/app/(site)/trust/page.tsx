import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { DocumentPage } from '../document-page'

/**
 * The trust bar, rendered from `@fusion.dev/insights`.
 *
 * **The point is that it is finite.** The risk this page exists to answer is
 * that a trust bar which is never defined can never be met, and perpetual
 * pre-launch is what happens to a company that keeps raising one. Written down and counted, it converts an internal gate that can be moved
 * forever into a public commitment that can actually be reached.
 *
 * The six are a numbered list in the file rather than an array of six objects,
 * which is the same count expressed in the form a person adding a seventh would
 * actually be editing, and the numbering is the list's own for the same reason:
 * the count is a fact about the document, so the document carries it.
 *
 * The numbers are a counter, and it is the component's rather than the site's:
 * the file holds an ordered list and `renderDocument` turns it into a railed
 * `helix-list`, which resets the counter on the list, increments it on each row
 * and draws the result in a track at the start edge.
 *
 * The second half is the part most companies leave out and the reason this page
 * is worth having at all: none of it has been exercised yet, because nothing
 * has shipped. Saying so is the same discipline the stage labels are.
 *
 * **It takes the shared document shell**, which is 206's finding: this page,
 * Trust and an insight are the same kind of thing, a single sustained argument,
 * and the insight page had already worked the layout out. Carrying a layout of
 * its own meant the measure, the heading scale and the block rhythm differed
 * between three pages a reader reads identically.
 */
const page = findSitePage('/trust')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/trust',
  title: 'Trust',
})

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <DocumentPage
      body={source ? await renderDocument(source) : null}
      kicker={page.kicker}
      lede={page.lede}
      title={page.title}
    />
  )
}
