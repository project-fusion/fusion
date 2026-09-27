import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPinInput } from '@fusion.dev/helix-headless/pin-input'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './pin-input-root.css.js'

/**
 * @summary A field for a short code, with one box for each character.
 *
 * @description
 * Square boxes at the control height, with space between them so the code reads
 * as separate characters.
 *
 * The focus ring is on the current box, so you can see which character comes
 * next.
 *
 * Figures are tabular, so every digit takes the same width and the row does not
 * shift as you type.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases PinField, OTP, One-time code, Verification code, InputPin
 * @documentation https://fusion.dev/helix/components/pin-input
 *
 * @csspart cell - One box.
 * @csspart field - The row of boxes.
 *
 * @cssproperty --pin-input-gap - The space between one box and the next.
 */
@customElement('helix-pin-input')
export class HelixPinInput extends HelixHeadlessPinInput {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pin-input': HelixPinInput
  }
}
