import { findVertical } from '../../verticals'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/mind')

export const metadata = { title: vertical?.name }

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage vertical={vertical} />
}
