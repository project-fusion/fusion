import { customElement } from '@helix-io/core'
import { HelixHeadlessColorInput } from '@helix-io/headless/color-input'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the tier below renders `<helix-slider>` and a
   custom element registers on import. Inherited from the base along with the
   template, which is why it has to be restated here: this file has no
   `<helix-slider>` in it to remind anyone. `check:composed` enforces it. */
import '../../color-picker/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './color-input-root.css.js'

/**
 * @summary A color, typed in any syntax or picked from a panel.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control.
 *
 * **The trigger fills the trailing end rather than sitting in it as an icon.** A
 * color field has one thing to show and it is a color, so the swatch takes the
 * height of the control and reads as a block of it. It is the one field here
 * whose trailing affordance is the value itself: Date Input's calendar mark
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
 * @category forms
 * @aliases ColorField, ColourInput, InputColor
 * @documentation https://helix.fusion.dev/components/color-input
 *
 * @cssproperty --color-input-background-color - Fill behind the field.
 * @cssproperty --color-input-border-color - Color of the panel's edge.
 * @cssproperty --color-input-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --color-input-panel-size - Width of the panel, and so of the square.
 * @cssproperty --color-input-shadow - Lift under the panel. Follows
 *   `--helix-shadow-floating`: a floating surface sits over content nobody can predict, so it
 *   keeps a lift by default.
 * @cssproperty --color-input-swatch-radii - Corner radius of that block.
 * @cssproperty --color-input-swatch-size - Edge length of the block in `appearance="swatch"`.
 */
@customElement('helix-color-input')
export class HelixColorInput extends HelixHeadlessColorInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-color-input': HelixColorInput
  }
}
