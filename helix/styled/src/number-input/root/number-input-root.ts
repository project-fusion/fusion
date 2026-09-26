import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNumberInput } from '@fusion.dev/helix-headless/number-input'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './number-input-root.css.js'

/**
 * @summary A field for a number, typed or changed with step buttons.
 *
 * @description
 * The frame an `Input` wears, because in a form this stands in a row with them.
 * The difference is inside it: a button at each end of the box rather than
 * beside it, so the whole reads as one field rather than a field with two
 * controls after it.
 *
 * The number is centered and set in tabular figures, which is the one place this
 * differs from every other field in the library. Digits are what changes under a
 * repeated press, and proportional ones make the number shuffle while it counts.
 *
 * The steppers are out of the tab order. A keyboard reader already has four keys
 * on the field itself, and two more tab stops per number is a form that takes
 * three times as long to cross.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases NumberField, Stepper, InputNumber
 * @documentation https://fusion.dev/helix/components/number-input
 *
 * @slot end - Content after the number, such as a unit.
 * @slot start - Content before the number, such as a unit or an icon.
 *
 * @csspart control - The input that holds the number.
 * @csspart decrement - The button that steps the value down.
 * @csspart field - The box that holds the whole control.
 * @csspart increment - The button that steps the value up.
 *
 * @cssproperty --number-input-background-color - The fill behind the number.
 */
@customElement('helix-number-input')
export class HelixNumberInput extends HelixHeadlessNumberInput {
  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-number-input': HelixNumberInput
  }
}
