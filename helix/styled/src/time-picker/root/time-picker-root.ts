import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimePicker } from '@fusion.dev/helix-headless/time-picker'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has neither tag in
   it to remind anyone. */
import '../../listbox/index.js'
import '../../option/index.js'
import { styles } from './time-picker-root.css.js'

/**
 * @summary A control for choosing a time from a list or from wheels.
 *
 * @description
 * The list has a bounded height on a surface of its own, because 96 rows are
 * taller than any place it is used. `--time-picker-list-block-size` sets the
 * bound as a height, so it does not need recomputing when the density changes.
 *
 * The picker has no border or fill of its own. On a page it takes the space it
 * is given, and inside Time Input the panel supplies both.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Time, TimeList
 * @documentation https://fusion.dev/helix/components/time-picker
 *
 * @cssproperty --time-picker-columns-gap - The space between the wheels. None by default.
 * @cssproperty --time-picker-feedback-color - The color of the message under the times, while `feedback` is set.
 * @cssproperty --time-picker-hover-background-color - Fill on a wheel's row under the pointer or the keyboard.
 * @cssproperty --time-picker-invalid-color - The ring around the chosen time, or around the times while nothing is chosen, while the picker is invalid.
 * @cssproperty --time-picker-list-block-size - How tall the list is before it scrolls.
 * @cssproperty --time-picker-mark-radius - The corners of the mark on a wheel's row.
 * @cssproperty --time-picker-range-color - Fill behind the times inside a range.
 * @cssproperty --time-picker-row-size - Height and minimum width of one row in a wheel.
 * @cssproperty --time-picker-selected-color - Fill on the chosen row of a wheel.
 * @cssproperty --time-picker-selected-foreground-color - Ink on the chosen row of a wheel.
 * @cssproperty --time-picker-wheel-block-size - How tall a wheel is. Five rows by default.
 * @cssproperty --time-picker-wheel-mask - The mask that fades a wheel toward its ends, as a `mask-image`. Set `none` for no fade.
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
