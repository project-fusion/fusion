import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterField } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-field.css.js'

/**
 * @summary A field that a filter can apply to, with its comparisons and values.
 *
 * @description
 * A declaration rather than a control: it renders nothing, and the filter input
 * reads it to build its menu. The headless note carries the model.
 *
 * The stylesheet here is one rule and it is a guard rather than a look. Written
 * where it belongs, inside a filter input, this is never assigned to a slot and
 * so is never rendered at all. Written anywhere else it would be an empty inline
 * box, which is nothing to look at and still a flex item a `gap` would space
 * away from its neighbors.
 *
 * @since 0.23.0
 * @status stable
 * @category forms
 * @aliases Facet, Dimension
 * @documentation https://fusion.dev/helix/components/filter-input
 */
@customElement('helix-filter-field')
export class HelixFilterField extends HelixHeadlessFilterField {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-field': HelixFilterField
  }
}
