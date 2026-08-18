import { customElement } from '@helix-io/core'
import { HelixBaseInputColor } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the tier below renders `<helix-slider>` and a
   custom element registers on import. Inherited from the base along with the
   template, which is why it has to be restated here: this file has no
   `<helix-slider>` in it to remind anyone. `check:composed` enforces it. */
import '../../color/index.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './input-color-root.css.js'

/**
 * @summary A colour, typed in any syntax or picked from a panel.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control.
 *
 * **The trigger fills the trailing end rather than sitting in it as an icon.** A
 * colour field has one thing to show and it is a colour, so the swatch takes the
 * height of the control and reads as a block of it. It is the one field here
 * whose trailing affordance is the value itself: Input Date's calendar mark
 * stands for an action, and an action stretched to field height is a large icon
 * and nothing more.
 *
 * **The panel has no padding, and clips instead.** The square runs to its edge
 * and takes the panel's rounded corners from being clipped by it, rather than
 * sitting inset with a band of overlay showing on all four sides. The picker
 * pads its own lower rows.
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
