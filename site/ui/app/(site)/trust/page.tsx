import { findSitePage, sitePageSources } from '@fusion-io/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { DocumentPage } from '../document-page'

/**
 * The trust bar, rendered from `@fusion-io/insights`.
 *
 * **The point is that it is finite.** `the internal plan` names the risk
 * this page exists to answer: a trust bar that is never defined can never be
 * met, and perpetual pre-launch is what happens to a company that keeps raising
 * one. Written down and counted, it converts an internal gate that can be moved
 * forever into a public commitment that can actually be reached.
 *
 * The six are a numbered list in the file rather than an array of six objects,
 * which is the same count expressed in the form a person adding a seventh would
 * actually be editing, and the numbering is the list's own for the same reason:
 * the count is a fact about the document, so the document carries it.
 *
 * **This said `##` headings and a CSS counter, and then said markers.** The file
 * holds an ordered list and `renderDocument` turns it into a railed
 * `helix-list`, so the numbers are a counter again: the list resets it and each
 * row increments it, and the row draws the result in a track at the start edge.
 * The correction before this one was right to say no counter existed in the
 * site's CSS, and it does not now either. The counter is the component's.
 *
 * Recorded rather than tidied away because this comment has now been wrong twice
 * about the same six numbers, which is what a comment describing an
 * implementation does when the implementation moves: it is the thing a reader
 * trusts instead of looking.
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
