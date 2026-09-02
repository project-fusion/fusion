import { MdxPage, mdxPageMetadata, type PageShape } from '@/components/mdx-page/mdx-page'

/**
 * What the company is, beside what it sells.
 *
 * `/company/services` is a route of its own: it carries offers, a price and a
 * closing action, which is more than a shape here can describe.
 */
const PAGES: Record<string, PageShape> = {
  thesis: { hero: true },
  trust: {},
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }))
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  return mdxPageMetadata(`/company/${page}`)
}

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  return <MdxPage path={`/company/${page}`} shape={PAGES[page] ?? {}} />
}
