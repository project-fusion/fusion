import Link from 'next/link'
import { PRODUCTS } from '@/content/products/products'
import { findVertical } from '@/content/verticals/verticals'
import { getFamilies } from '../../../content/catalog/catalog'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/helix')
const product = PRODUCTS.find((entry) => entry.href === '/helix')

/**
 * Helix, which is what this route is about rather than what it lists.
 *
 * **It was the product page and the component index at once**, and every
 * awkward route below it was downstream of that: the masthead's Components row
 * pointed here at a page titled Helix, `/helix/docs` had to be a `redirect()`,
 * and `/helix/components` existed only as a `[family]` segment with no index
 * above it. The index moved down and this became the overview. See 189.
 *
 * **The first version of that was a stub and this is the correction.** It
 * rendered `VerticalPage` and nothing else, which is right for `/cortex`,
 * where there is genuinely nowhere to go yet, and wrong here: Helix is the one
 * product with four real surfaces, so an overview that names none of them is a
 * page that took the gallery away and put nothing in its place.
 *
 * Everything below is read from the registries the megamenu and the landing
 * page already read, so the four destinations cannot drift from the panel and
 * the install line cannot drift from the card. The family count comes from the
 * manifest, which is the same source the index counts.
 */
export const metadata = { title: product?.name ?? vertical?.name }

export default function Page() {
  if (!vertical || !product) {
    return null
  }
  const families = getFamilies().length

  return (
    <VerticalPage product={product} vertical={vertical}>
      {/* The command, where there is one. `Building` with an install line is
          not a contradiction here: the packages publish, and what is Building
          is the library's completeness rather than its existence. */}
      {product.install && (
        <helix-flex direction="column" gap="sm">
          <helix-code-block label={`Install ${product.name}`}>{product.install}</helix-code-block>
          <helix-text tone="subtle" variant="caption">
            {product.license}, and {families} families ship today.
          </helix-text>
        </helix-flex>
      )}

      <helix-flex direction="column" gap="md">
        <helix-text as="h2" variant="title">
          Where to go
        </helix-text>
        {/* The same four rows the megamenu shows, from the same array. A panel
            and an overview disagreeing about what a product contains is the
            fault two lists of it would eventually produce.

            `data-card` is the wrapper recipe and wants a card inside it: the
            anchor is the consumer's own and the surface is `helix-card`, which
            is how the hover and the focus ring reach a card at any depth. A
            bare `data-card` renders a link with no surface at all, which is
            what the first version of this page did.

            Two columns for four rows, which is the third time today: at
            `18rem` this fitted three at desktop width and orphaned the fourth
            onto a row with two empty columns beside it. */}
        <helix-grid gap="lg" min="26rem">
          {product.destinations.map((destination) => (
            <Link data-card href={destination.href} key={destination.href}>
              <helix-card separation="outlined">
                <helix-text as="h3" slot="header" variant="title">
                  {destination.title}
                </helix-text>
                <helix-text tone="muted">{destination.summary}</helix-text>
              </helix-card>
            </Link>
          ))}
        </helix-grid>
      </helix-flex>
    </VerticalPage>
  )
}
