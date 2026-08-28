import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeInput } from '@fusion.dev/helix-headless/time-input'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports, because the tier below renders both of these and a custom
   element registers on import. Inherited from the base along with the template,
   which is why they are restated here. `check:composed` enforces it. */
import '../../icon/index.js'
import '../../tag/index.js'
import '../../time-picker/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './time-input-root.css.js'

/**
 * @summary A time, typed or picked from a list.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger is a mark within that box rather than a button beside it,
 * the arrangement Date Input settled on.
 *
 * The panel is the field's width, which is the one place this differs from Input
 * Date: a calendar is seven columns with a width of its own, and a list of times
 * is a column of one line each, so it should be as wide as the control it
 * belongs to. That is the same reasoning Select gives for its own list.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://helix.fusion.dev/components/time-input
 *
 * @cssproperty --time-input-background-color - Fill behind the field.
 * @cssproperty --time-input-border-color - Color of the panel's edge.
 * @cssproperty --time-input-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --time-input-shadow - Lift under the panel. Follows `--helix-shadow-floating`:
 *   a floating surface sits over content nobody can predict, so it keeps a lift by default.
 */
@customElement('helix-time-input')
export class HelixTimeInput extends HelixHeadlessTimeInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-time-input': HelixTimeInput
  }
}
