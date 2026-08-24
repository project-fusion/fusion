import { PRODUCTS } from '../../products'
import { findVertical, stageAppearance } from '../../verticals'
import { VerticalPage } from '../vertical-page'
import { CORTEX_MODULES } from './modules'

const vertical = findVertical('/cortex')
const product = PRODUCTS.find((entry) => entry.href === '/cortex')

/**
 * Cortex, which is what this route is now named for.
 *
 * The title is the product and the vertical is the eyebrow, matching `/helix`.
 * Both registries are read rather than either being restated here, so the page,
 * the megamenu and the landing page cannot disagree about what Cortex is.
 *
 * **The three modules are described here and named in no nav row**, which is
 * 199's decision and the reason they have a home at all: a row asserts a
 * destination, and Recall is Declared. Each carries its own stage, so the
 * difference between two that are being built and one that is not is visible
 * rather than flattened into the product's single label.
 */
export const metadata = { title: product?.name ?? vertical?.name }

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
        <helix-grid columns={3} gap="lg">
          {CORTEX_MODULES.map((module) => (
            <helix-card key={module.title} separation="outlined">
              <helix-flex align="center" gap="sm" justify="between" slot="header">
                <helix-text as="h3" variant="title">
                  {module.title}
                </helix-text>
                <helix-tag tone={stageAppearance(module.stage)}>{module.stage}</helix-tag>
              </helix-flex>
              <helix-text tone="muted">{module.body}</helix-text>
            </helix-card>
          ))}
        </helix-grid>
      </helix-flex>
    </VerticalPage>
  )
}
