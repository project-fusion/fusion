import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { pageMetadata } from '@/utils/metadata/metadata'
import { renderDocument } from '../../../utils/mdx/mdx'
import { DocumentPage } from '../document-page'

/**
 * What is shipping, what is being built, and what is only declared.
 *
 * **The hero's pill points here, which is why the page exists.** That pill said
 * `News` and went to the gallery, so the first thing on the site pointed at a
 * list of essays rather than at what the product is doing. A reader asking
 * "is this real yet" was answered with writing.
 *
 * **It takes the shared document shell without the band**, unlike an insight or
 * the thesis. Those are arguments somebody chose to read and a hero is the cover
 * of the piece; this is a page a reader arrives at holding a question, and the
 * answer should start at the top of it.
 *
 * **The stage labels are the ones the repository already uses**, and they are
 * used literally here for the reason they are used literally everywhere: Active
 * ships with users, Building is real work with nothing shipped, Declared is a
 * committed direction with no work started. A page that puts all three under one
 * heading is a page where a plan and a product look the same.
 *
 * The entries under them are added as each becomes true rather than when it
 * becomes likely, which is why the page currently publishes none: a roadmap
 * written ahead of the work is a forecast, and this is not one.
 */
const page = findSitePage('/announcements')

export const metadata = pageMetadata({
  description: page?.description ?? '',
  path: '/announcements',
  title: 'Announcements',
})

export default async function Page() {
  if (!page) {
    return null
  }
  const source = sitePageSources[page.slug]
  return (
    <DocumentPage
      body={source ? await renderDocument(source) : null}
      centered
      lede={page.lede}
      meta={<helix-tag tone="primary">Announcement</helix-tag>}
      title={page.title}
    />
  )
}
