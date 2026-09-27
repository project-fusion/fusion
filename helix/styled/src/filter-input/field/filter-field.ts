import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterField } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-field.css.js'

/**
 * @summary A field that a filter can apply to, with its comparisons and values.
 *
 * @description
 * Declares a filter field. It renders nothing, and the filter input reads it to
 * build its menu. The headless element documents the model.
 *
 * The stylesheet has one rule, `display: none`, as a guard. Inside a filter
 * input, the element is never assigned to a slot and never renders. Anywhere
 * else, it would be an empty inline box that still counts as a flex item and
 * gets `gap` spacing.
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
