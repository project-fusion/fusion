import { customElement } from '@helix-io/core'
import { HelixBaseTime } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports, because the tier below renders both of these and a custom
   element registers on import. Inherited from the base along with the template,
   which is why they are restated here: this file has neither tag in it to remind
   anyone. `check:composed` enforces it. */
import '../../listbox/index.js'
import '../../option/index.js'
import { styles } from './time-root.css.js'

/**
 * @summary Picks a time, from a list of them.
 *
 * @description
 * A bounded list on a surface of its own, because ninety-six rows is taller than
 * anywhere it will be put. `--time-list-height` is the bound and it is a height
 * rather than a count of rows: what a panel has is room, and a row count would
 * have to be recomputed every time the density changed.
 *
 * No border and no fill of its own. Flat on a page it takes what it is given,
 * and in Input Time's panel the panel supplies both: a list that brought its own
 * card would be a card inside a card there.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TimePicker, TimeList
 * @documentation https://helix.fusion.dev/components/time
 *
 * @cssproperty --time-list-height - How tall the list is before it scrolls.
 * @cssproperty --time-wheel-height - How tall a wheel is. Five rows by default.
 * @cssproperty --time-row-size - Height and least width of one row in a wheel.
 * @cssproperty --time-range-color - Wash behind the times inside a range.
 */
@customElement('helix-time')
export class HelixTime extends HelixBaseTime {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-time': HelixTime
  }
}
