import { MdxPage, mdxPageMetadata } from '@/components/mdx-page/mdx-page'

/**
 * Announcements, which belong to neither `/legal` nor `/company`.
 *
 * Centered and tagged rather than kickered: it reads as a notice rather than as
 * a section of the site.
 */
export const dynamicParams = false

export function generateMetadata() {
  return mdxPageMetadata('/announcements')
}

export default function Page() {
  return (
    <MdxPage
      path="/announcements"
      shape={{ centered: true, meta: <helix-tag tone="primary">Announcement</helix-tag> }}
    />
  )
}
