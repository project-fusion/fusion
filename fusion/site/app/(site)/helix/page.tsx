import Link from 'next/link'
import { VerticalPage } from '@/components/vertical-page/vertical-page'
import { PRODUCTS } from '@/content/products/products'
import { findVertical } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { getFamilies } from '../../../content/catalog/catalog'

const vertical = findVertical('/helix')
const product = PRODUCTS.find((entry) => entry.href === '/helix')

/**
 * Helix, which is what this route is about rather than what it lists.
 */
export const metadata = pageMetadata({
  description: product?.body ?? vertical?.summary ?? '',
  path: '/helix',
  title: product?.name ?? vertical?.name ?? 'Helix',
})

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
        {/*
         *  The same four rows the megamenu shows, from the same array. A panel
         *             and an overview disagreeing about what a product contains is the
         *             fault two lists of it would eventually produce.
         *
         *             Two columns for four rows: at `18rem` this fits three at desktop
         *             width and orphans the fourth onto a row with two empty columns beside
         *             it.
         */}
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
