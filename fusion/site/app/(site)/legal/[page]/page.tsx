import { MdxPage, mdxPageMetadata, type PageShape } from '@/components/mdx-page/mdx-page'

/**
 * The three pages a reader scans a footer for.
 *
 * **Under `/legal` rather than at the root**, so the address says what the page
 * is before it is opened and the three are one thing rather than three
 * top-level pages that happen to be about the same subject.
 *
 * All three take an outline: they are long, they are read by someone looking
 * for one clause, and the rail is how that person finds it.
 */
const PAGES: Record<string, PageShape> = {
  'acceptable-use': { outline: true },
  privacy: { outline: true },
  terms: { outline: true },
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }))
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  return mdxPageMetadata(`/legal/${page}`)
}

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  return <MdxPage path={`/legal/${page}`} shape={PAGES[page] ?? {}} />
}
