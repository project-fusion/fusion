import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeInput } from '@fusion.dev/helix-headless/time-input'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has neither tag in
   it to remind anyone. */
import '../../tag/index.js'
import '../../time-picker/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
import { styles } from './time-input-root.css.js'

/**
 * @summary A field for a time, typed or picked from a list.
 *
 * @description
 * The frame wraps the whole field, so the trigger sits in the same box as the
 * text and the focus ring goes around the whole control. The trigger is drawn
 * inside that box, as in Date Input.
 *
 * The panel is as wide as the field. This is the one difference from Input
 * Date, whose calendar has seven columns and a width of its own. A list of
 * times is one column, so it matches the control, as Select's list does.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://fusion.dev/helix/components/time-input
 *
 * @cssproperty --time-input-background-color - Fill behind the field.
 * @cssproperty --time-input-border-color - Color of the panel's edge.
 * @cssproperty --time-input-border-width - Width of the panel's edge. Defaults to
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless
 *   your theme sets a width.
 * @cssproperty --time-input-shadow - Shadow under the panel. Defaults to
 *   `--helix-shadow-floating`, because the panel can sit over any content.
 */
@customElement('helix-time-input')
export class HelixTimeInput extends HelixHeadlessTimeInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    tagRowStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-time-input': HelixTimeInput
  }
}
