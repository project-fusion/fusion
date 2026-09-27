import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessColorInput } from '@fusion.dev/helix-headless/color-input'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has no
   `<helix-color-picker>` in it to remind anyone. */
import '../../color-picker/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles } from './color-input-root.css.js'

/**
 * @summary A field for a color, typed in any syntax or picked from a panel.
 *
 * @description
 * The frame wraps the whole field, so the trigger sits inside the same box as
 * the text and one focus ring surrounds the control.
 *
 * The trigger fills the trailing end of the field. It is a swatch of the
 * current color at the full height of the control. Date Input's calendar
 * trigger stays icon-sized, because it stands for an action.
 *
 * The panel has no padding and clips its content, so the square runs to the
 * panel's edges and takes its rounded corners. The picker pads its own lower
 * rows.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases ColorField, ColourInput, InputColor
 * @documentation https://fusion.dev/helix/components/color-input
 *
 * @cssproperty --color-input-background-color - Fill behind the field.
 * @cssproperty --color-input-border-color - Color of the panel's edge.
 * @cssproperty --color-input-border-width - Width of the panel's edge. Defaults to `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless a theme sets a border.
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --color-input-panel-size - Width of the panel, and so of the square.
 * @cssproperty --color-input-shadow - Shadow under the panel. Defaults to `--helix-shadow-floating`, so the panel keeps a shadow over any content below it.
 *   `--helix-shadow-floating`: a floating surface sits over content nobody can predict, so it
 *   keeps a lift by default.
 * @cssproperty --color-input-swatch-radius - Corner radius of the swatch in `variant="swatch"`.
 * @cssproperty --color-input-swatch-size - Edge length of the swatch in `variant="swatch"`.
 */
@customElement('helix-color-input')
export class HelixColorInput extends HelixHeadlessColorInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-color-input': HelixColorInput
  }
}
