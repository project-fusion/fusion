import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { outlineOf } from '../../../utils/outline/outline'
import { DocumentPage } from '../document-page'

/**
 * Privacy, rendered from `@fusion.dev/insights`.
 *
 * **The writing belongs to the company rather than to the site**, which is why
 * the source is an MDX file in `fusion/docs/insights` beside the thesis and the trust
 * bar rather than markup in this file. Replacing the renderer would otherwise
 * take the legal text with it.
 *
 * It takes the shared document shell for the reason Trust does: this is one
 * sustained argument read top to bottom, and a layout of its own would give a
 * reader a different measure and heading scale on a page they read identically.
 */
const page = findSitePage('/privacy')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/privacy',
  title: 'Privacy',
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
