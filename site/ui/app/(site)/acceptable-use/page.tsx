import { findSitePage, sitePageSources } from '@fusion-io/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { outlineOf } from '../../../utils/outline/outline'
import { DocumentPage } from '../document-page'

/**
 * Acceptable use, rendered from `@fusion-io/insights`.
 *
 * Sits beside the terms rather than inside them, because it answers a different
 * question: the terms say what the arrangement is, this says what the two pages
 * that execute a reader's code will and will not run. Most of what such a policy
 * usually forbids is unreachable here, which is worth stating in its own document
 * rather than as a paragraph somebody skims.
 */
const page = findSitePage('/acceptable-use')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/acceptable-use',
  title: 'Acceptable use',
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
      outline={source ? outlineOf(source) : undefined}
      title={page.title}
    />
  )
}
