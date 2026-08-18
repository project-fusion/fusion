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
 * @summary A colour, typed as hex or moved on its channels.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger carries a chip of the colour itself, which is the only
 * part of this component that says what it holds without being read.
 *
 * **Every swatch sits on a checkerboard.** A colour with alpha painted on a
 * solid background is just a different colour, and the one thing a preview owes
 * a reader is the difference between "pale blue" and "blue, half transparent".
 *
 * **The channel tracks are painted with the colours they choose**, through
 * `--slider-track-image` on the real slider. Saturation and lightness are built
 * from wherever the other channels currently stand, so each track shows the
 * colours actually reachable from here rather than a fixed ramp ending somewhere
 * the reader cannot get to.
 *
 * The hue track is the raw spectrum and takes no token. Every other colour here
 * is a role a theme may change; the wheel is not one, and a themed hue slider
 * would be a slider that lies about what it selects.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases ColorPicker, ColorField, ColourInput
 * @documentation https://helix.fusion.dev/components/input-color
 *
 * @cssproperty --input-color-background-color - Fill behind the field.
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
