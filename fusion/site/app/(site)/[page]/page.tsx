import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { DocumentPage } from '@/components/document-page/document-page'
import { renderDocument } from '@/utils/mdx/mdx'
import { pageMetadata } from '@/utils/metadata/metadata'
import { outlineOf } from '@/utils/outline/outline'

/**
 * Every page whose whole content is one MDX file from `@fusion.dev/insights`.
 *
 * **Six routes were six files that differed by a path string and a title.** The
 * variation that is real is small enough to be a table: whether the document
 * carries an outline, whether it opens as a hero, whether it is centered, and
 * what sits in the meta slot. Anything needing more than that has its own
 * route, which is what `/services` is and why it is not here.
 *
 * `dynamicParams` is off, so a slug not in the table 404s through the site's own
 * `not-found` rather than rendering an empty document.
 */
const SHAPES: Record<
  string,
  { centered?: boolean; hero?: boolean; meta?: ReactNode; outline?: boolean }
> = {
  'acceptable-use': { outline: true },
  announcements: { centered: true, meta: <helix-tag tone="primary">Announcement</helix-tag> },
  privacy: { outline: true },
  terms: { outline: true },
  thesis: { hero: true },
  trust: {},
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(SHAPES).map((page) => ({ page }))
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page: slug } = await params
  const page = findSitePage(`/${slug}`)
  return pageMetadata({
    description: page?.description ?? '',
    path: `/${slug}`,
    title: page?.title ?? '',
  })
}

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page: slug } = await params
  const shape = SHAPES[slug]
  const page = findSitePage(`/${slug}`)
  if (!shape || !page) {
    notFound()
  }
  const source = sitePageSources[page.slug]
  return (
    <DocumentPage
      body={source ? await renderDocument(source) : null}
      centered={shape.centered}
      hero={shape.hero}
      kicker={shape.centered ? undefined : page.kicker}
      lede={page.lede}
      meta={shape.meta}
      outline={shape.outline && source ? outlineOf(source) : undefined}
      title={page.title}
    />
  )
}
