import { customElement } from '@helix-io/core'
import { HelixBaseInputColor } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the tier below renders `<helix-slider>` and a
   custom element registers on import. Inherited from the base along with the
   template, which is why it has to be restated here: this file has no
   `<helix-slider>` in it to remind anyone. `check:composed` enforces it. */
import '../../slider/index.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './input-color-root.css.js'

/**
 * @summary A colour, typed in any syntax or picked from a panel.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger carries a chip of the colour, which is the only part of
 * this component that says what it holds without being read.
 *
 * **The square is painted in three layers, not composited from elements**: the
 * hue underneath, white sliding in from the left to take the saturation out,
 * black rising from the bottom to take the brightness out. One element, one
 * declaration, and it repaints as the hue moves because the hue is a custom
 * property the tier below writes.
 *
 * **The two range inputs over it are invisible and still there.** Not
 * `display: none` and not `visibility: hidden`, either of which would take them
 * out of the tab order and out of the accessibility tree, which is the entire
 * reason a square built this way is reachable at all. They carry
 * `pointer-events: none` so the square answers the pointer itself, and the focus
 * ring is drawn on the square rather than on them, so it lands where the reader
 * is looking.
 *
 * **Every chip sits on a checkerboard.** A colour with alpha painted on a solid
 * background is just a different colour, and the one thing a preview owes a
 * reader is the difference between "pale blue" and "blue, half transparent".
 *
 * The hue ramp and the square's base take no token. Every other colour here is a
 * role a theme may change; the wheel is not one, and a themed picker would be
 * one that lies about what it selects.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases ColorPicker, ColorField, ColourInput
 * @documentation https://helix.fusion.dev/components/input-color
 *
 * @cssproperty --input-color-background-color - Fill behind the field.
 * @cssproperty --input-color-panel-size - Width of the panel, and so of the square.
 */
@customElement('helix-input-color')
export class HelixInputColor extends HelixBaseInputColor {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input-color': HelixInputColor
  }
}
