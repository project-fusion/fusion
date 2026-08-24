import { findVertical } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/capital')

export const metadata = pageMetadata({
  description: vertical?.summary ?? '',
  path: '/capital',
  title: vertical?.name ?? 'Fusion Capital',
})

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage vertical={vertical} />
}
