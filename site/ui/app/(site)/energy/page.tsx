import { findVertical } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/energy')

export const metadata = pageMetadata({
  description: vertical?.summary ?? '',
  path: '/energy',
  title: vertical?.name ?? 'Fusion Energy',
})

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage vertical={vertical} />
}
