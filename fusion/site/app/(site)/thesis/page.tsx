import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { DocumentPage } from '../document-page'

/**
 * The thesis, rendered from `@fusion.dev/insights`.
 *
 * **The prose is a flat MDX file and this is a frame around it.** What is left
 * here is the two things a document cannot carry: where it sits on the page,
 * and the hero above it. Everything else is in the file.
 *
 * **It takes the shared document shell.** This page, Trust and an insight are
 * the same kind of thing, a single sustained argument, so a layout of its own
 * would make the measure, the heading scale and the block rhythm differ between
 * three pages a reader reads identically.
 */
const page = findSitePage('/thesis')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/thesis',
  title: 'Thesis',
})

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <DocumentPage
      body={source ? await renderDocument(source) : null}
      hero
      kicker={page.kicker}
      lede={page.lede}
      title={page.title}
    />
  )
}
