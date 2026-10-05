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
 * Uses the same frame as `Input`, so the two line up in a form. A button sits
 * at each end inside the box, so the whole control reads as one field.
 *
 * The number is centered and set in tabular figures, which no other field in
 * the library does. The digits change under repeated presses, and proportional
 * figures would make the number shift as it counts.
 *
 * The stepper buttons are out of the tab order. The field already has four keys
 * for keyboard users, and two more tab stops per number would make a form three
 * times as long to cross.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases NumberField, Stepper, InputNumber
 * @documentation https://fusion.dev/helix/components/number-input
 *
 * @slot end - Content after the number, such as a unit.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
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
