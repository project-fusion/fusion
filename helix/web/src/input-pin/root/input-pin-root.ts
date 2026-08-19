import { customElement } from '@helix-io/core'
import { HelixBaseInputPin } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './input-pin-root.css.js'

/**
 * @summary A short code, one character to a box.
 *
 * @description
 * Square boxes at the control height with real space between them, which is the
 * whole picture: a code is read as separate characters, and boxes shoulder to
 * shoulder read as one field with lines drawn in it.
 *
 * The focus ring is on the box the reader is in rather than around the row. A
 * code is entered one character at a time and the boxes exist to say which one
 * is next, so a ring around all six would answer the question the component is
 * for.
 *
 * Figures are tabular, so a 1 takes the room an 8 does and the row does not
 * breathe as a code is typed into it.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases PinField, OTP, One-time code, Verification code
 * @documentation https://helix.fusion.dev/components/input-pin
 *
 * @csspart field - The row of boxes.
 * @csspart cell - One box.
 *
 * @cssproperty --pin-gap - Space between one box and the next.
 */
@customElement('helix-input-pin')
export class HelixInputPin extends HelixBaseInputPin {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input-pin': HelixInputPin
  }
}
