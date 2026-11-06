import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessQuickFilter } from '@fusion.dev/helix-headless/quick-filters'

/**
 * @summary One preset in a Quick Filters row: a name and the parts of a Data Table's view it sets.
 *
 * @description
 * The row draws the preset's button, so the preset itself draws nothing.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Preset, Saved filter, View tab
 * @documentation https://fusion.dev/helix/components/quick-filters
 */
@customElement('helix-quick-filter')
export class HelixQuickFilter extends HelixHeadlessQuickFilter {}

declare global {
  interface HTMLElementTagNameMap {
    'helix-quick-filter': HelixQuickFilter
  }
}
