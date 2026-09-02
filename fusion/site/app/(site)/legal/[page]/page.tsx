import { MdxPage, mdxPageMetadata, type PageShape } from '@/components/mdx-page/mdx-page'

/**
 * The three pages a reader scans a footer for.
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
