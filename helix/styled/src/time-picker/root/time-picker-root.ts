import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimePicker } from '@fusion.dev/helix-headless/time-picker'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports, because the tier below renders both of these and a custom
   element registers on import. Inherited from the base along with the template,
   which is why they are restated here: this file has neither tag in it to remind
   anyone. */
import '../../listbox/index.js'
import '../../option/index.js'
import { styles } from './time-picker-root.css.js'

/**
 * @summary Picks a time, from a list of them.
 *
 * @description
 * A bounded list on a surface of its own, because ninety-six rows is taller than
 * anywhere it will be put. `--time-picker-list-block-size` is the bound and it is a height
 * rather than a count of rows: what a panel has is room, and a row count would
 * have to be recomputed every time the density changed.
 *
 * No border and no fill of its own. Flat on a page it takes what it is given,
 * and in Time Input's panel the panel supplies both: a list that brought its own
 * card would be a card inside a card there.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Time, TimeList
 * @documentation https://helix.fusion.dev/components/time-picker
 *
 * @cssproperty --time-picker-list-block-size - How tall the list is before it scrolls.
 * @cssproperty --time-picker-range-color - Wash behind the times inside a range.
 * @cssproperty --time-picker-row-size - Height and least width of one row in a wheel.
 * @cssproperty --time-picker-selected-color - Fill on the chosen row of a wheel.
 * @cssproperty --time-picker-wheel-block-size - How tall a wheel is. Five rows by default.
 */
@customElement('helix-time-picker')
export class HelixTimePicker extends HelixHeadlessTimePicker {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-time-picker': HelixTimePicker
  }
}
