import { findSitePage, sitePageSources } from '@fusion-io/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderMdx } from '../../../utils/mdx/mdx'
import { DocumentPage } from '../document-page'

/**
 * Terms of use, rendered from `@fusion-io/insights`.
 *
 * **The writing belongs to the company rather than to the site**, which is why
 * the source is an MDX file in `docs/insights` beside the thesis and the trust
 * bar rather than markup in this file. Replacing the renderer would otherwise
 * take the legal text with it.
 *
 * It takes the shared document shell for the reason Trust does: this is one
 * sustained argument read top to bottom, and a layout of its own would give a
 * reader a different measure and heading scale on a page they read identically.
 */
const page = findSitePage('/terms')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/terms',
  title: 'Terms of use',
})

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
