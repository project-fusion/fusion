import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterMenu } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-menu.css.js'

/**
 * @summary The control that builds a filter: pick a field, tick its values.
 *
 * @description
 * Everything drawn here is drawn by something else: the trigger is the
 * consumer's, and the pages are `Menu`'s, whose reserved tick column is what
 * keeps a page of ticked and unticked values on one edge. This element's own
 * stylesheet is one rule, and it is `display: contents`.
 *
 * The headless note carries the model, including why a tick is a filter
 * immediately and why the operator is decided here rather than on the chip.
 *
 * @since 0.25.0
 * @status experimental
 * @category forms
 * @aliases FacetPicker, FilterBuilder
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @event {HelixFacetEvent} helix-facet - Fired when a field's values change. Cancelable: refusing it takes the decision and nothing moves.
 */
@customElement('helix-filter-menu')
export class HelixFilterMenu extends HelixHeadlessFilterMenu {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-menu': HelixFilterMenu
  }
}
