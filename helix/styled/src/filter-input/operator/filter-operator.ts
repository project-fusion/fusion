import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterOperator } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-operator.css.js'

/**
 * @summary One way a filter can compare a field to its values.
 *
 * @description
 * Declares an operator. It renders nothing, and the field it is written under
 * reads it. The headless element documents the model, including why the
 * operator words are yours.
 *
 * The stylesheet has one rule, `display: none`, as a guard, for the reason
 * given on `FilterField`.
 *
 * @since 0.23.0
 * @status stable
 * @category forms
 * @aliases Comparator, Predicate
 * @documentation https://fusion.dev/helix/components/filter-input
 */
@customElement('helix-filter-operator')
export class HelixFilterOperator extends HelixHeadlessFilterOperator {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-operator': HelixFilterOperator
  }
}
