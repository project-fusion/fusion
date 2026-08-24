import { PRODUCTS } from '../../products'
import { findVertical } from '../../verticals'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/helix')
const product = PRODUCTS.find((entry) => entry.href === '/helix')

/**
 * Helix, which is what this route is now about rather than what it lists.
 *
 * **It was the product page and the component index at once**, and every
 * awkward route below it was downstream of that. The masthead's Components row
 * pointed here, at a page titled Helix. `/helix/docs` had to be a `redirect()`
 * to the first page of the first section, because an index in front of a table
 * of contents is a click between a reader and what they asked for, which is
 * only true when there is no product page for it to be part of. And
 * `/helix/components` existed solely as a `[family]` segment with no index
 * above it, which is the one URL a reader would guess. See 189.
 *
 * The shape that resolves all three: `/helix` is the overview, and the index
 * moved to `/helix/components`. Both registries are read rather than either
 * being restated here, so this page, the megamenu and the landing page cannot
 * disagree about what Helix is, which is the same arrangement `/cortex` uses.
 */
export const metadata = { title: product?.name ?? vertical?.name }

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage product={product} vertical={vertical} />
}
