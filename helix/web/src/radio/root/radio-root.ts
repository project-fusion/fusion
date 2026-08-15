import { customElement } from '@helix-io/core'
import { HelixBaseRadio } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './radio-root.css.js'

/**
 * @summary One choice in a radio group.
 *
 * @description
 * A circle with a dot in it, drawn here rather than by the browser for the
 * reason the checkbox's box is: this is a `<button role="radio">`, so there was
 * never a native control to restyle, and the weight and the motion of the mark
 * are ours either way.
 *
 * The dot scales from nothing, like the checkbox's tick, so choosing shows
 * something happening. It has no colour, because colour is reserved for state
 * and being chosen is an answer rather than a state.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Option, Choice
 * @documentation https://helix.fusion.dev/components/radio
 *
 * @cssproperty --radio-size - Diameter of the circle.
 * @cssproperty --radio-mark-color - Colour of the dot.
 */
@customElement('helix-radio')
export class HelixRadio extends HelixBaseRadio {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio': HelixRadio
  }
}
