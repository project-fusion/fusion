import { VerticalPage } from '@/components/vertical-page/vertical-page'
import { PRODUCTS } from '@/content/products/products'
import { findVertical, stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { CORTEX_MODULES } from './modules'

const vertical = findVertical('/cortex')
const product = PRODUCTS.find((entry) => entry.href === '/cortex')

/**
 * Cortex, which is what this route is now named for.
 */
export const metadata = pageMetadata({
  description: product?.body ?? vertical?.summary ?? '',
  path: '/cortex',
  title: product?.name ?? vertical?.name ?? 'Cortex',
})

export default function Page() {
  if (!vertical) {
    return null
  }
  return (
    <VerticalPage product={product} vertical={vertical}>
      <helix-flex direction="column" gap="md">
        <helix-text as="h2" variant="title">
          What is inside it
        </helix-text>
        {/* **`min` rather than a fixed three**, which at 375 gave three columns
            of about 130px with every word on its own line and the third clipped
            off the edge. `min` is the grid's own auto behavior and it is pure
            CSS: `repeat(auto-fit, minmax(min(18rem, 100%), 1fr))` wraps on its
            own container, needs no measurement of the viewport and no state, so
            it works in server-rendered markup with no JavaScript. `columns`
            stays as the ceiling for a wide screen. */}
        <helix-grid columns={3} gap="lg" min="18rem">
          {CORTEX_MODULES.map((module) => (
            <helix-card key={module.title} separation="outlined">
              <helix-flex align="center" gap="sm" justify="between" slot="header">
                <helix-text as="h3" variant="title">
                  {module.title}
                </helix-text>
                <helix-tag tone={stageAppearance(module.stage)}>{module.stage}</helix-tag>
              </helix-flex>
              <helix-text emphasis="muted">{module.body}</helix-text>
            </helix-card>
          ))}
        </helix-grid>
      </helix-flex>
    </VerticalPage>
  )
}
