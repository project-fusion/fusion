import { findVertical } from '@/content/verticals/verticals'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/capital')

export const metadata = { title: vertical?.name }

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage vertical={vertical} />
}
