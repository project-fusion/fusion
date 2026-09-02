import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { DocumentPage } from '@/components/document-page/document-page'
import { renderDocument } from '@/utils/mdx/mdx'
import { pageMetadata } from '@/utils/metadata/metadata'
import { outlineOf } from '@/utils/outline/outline'

/**
 * How one MDX page departs from the default, which is most of what a section
 * route has to say about its own pages.
 *
 * Anything needing more than these four is a route of its own rather than a
 * fifth field here.
 */
export interface PageShape {
  centered?: boolean
  hero?: boolean
  meta?: ReactNode
  outline?: boolean
}

/**
 * A page whose whole content is one MDX file from `@fusion.dev/insights`.
 *
 * **The sections own their tables and this owns the rendering.** `/legal` and
 * `/company` differ by which slugs they serve and by nothing else, so a second
 * copy of this function would be a second place for the shape of a document to
 * be decided.
 */
export async function MdxPage({ path, shape }: { path: string; shape: PageShape }) {
  const page = findSitePage(path)
  if (!page) {
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

/** The metadata for one of those pages, read from the same record. */
export function mdxPageMetadata(path: string) {
  const page = findSitePage(path)
  return pageMetadata({
    description: page?.description ?? '',
    path,
    title: page?.title ?? '',
  })
}
