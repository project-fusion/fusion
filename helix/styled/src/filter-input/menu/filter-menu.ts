import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterMenu } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-menu.css.js'
import '../../divider/index.js'
import '../../menu/index.js'

/**
 * @summary A menu for building a filter by picking a field and checking its values.
 *
 * @description
 * Draws nothing of its own. The trigger is yours, and the pages are `Menu`'s,
 * whose reserved tick column keeps ticked and unticked values aligned. The
 * element's stylesheet has one rule: `display: contents`.
 *
 * The headless element documents the model, including why a tick applies a
 * filter immediately and why the menu decides the operator.
 *
 * @since 0.25.0
 * @status stable
 * @category forms
 * @aliases FacetPicker, FilterBuilder
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @event {HelixFacetEvent} helix-facet - Fired when a field's values change. Cancelable: call `preventDefault()` to keep the previous values.
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
