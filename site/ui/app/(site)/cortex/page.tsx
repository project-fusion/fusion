import { PRODUCTS } from '../../products'
import { findVertical } from '../../verticals'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/cortex')
const product = PRODUCTS.find((entry) => entry.href === '/cortex')

/**
 * Cortex, which is what this route is now named for.
 *
 * The title is the product and the vertical is the eyebrow, matching `/helix`.
 * Both registries are read rather than either being restated here, so the page,
 * the megamenu and the landing page cannot disagree about what Cortex is.
 */
export const metadata = { title: product?.name ?? vertical?.name }

export default function Page() {
  if (!vertical) {
    return null
  }
  return <VerticalPage product={product} vertical={vertical} />
}
