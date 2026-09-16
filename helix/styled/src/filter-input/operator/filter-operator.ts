import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterOperator } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-operator.css.js'

/**
 * @summary One way a filter can compare a field to its values.
 *
 * @description
 * A declaration rather than a control: it renders nothing, and the field it is
 * written under reads it. The headless note carries the model, including why the
 * words are the consumer's and never this element's.
 *
 * The stylesheet is one rule and it is a guard rather than a look, for the
 * reason `FilterField`'s note gives.
 *
 * @since 0.23.0
 * @status experimental
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
