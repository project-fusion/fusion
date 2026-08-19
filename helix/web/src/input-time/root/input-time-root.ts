import { customElement } from '@helix-io/core'
import { HelixBaseInputTime } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports, because the tier below renders both of these and a custom
   element registers on import. Inherited from the base along with the template,
   which is why they are restated here. `check:composed` enforces it. */
import '../../icon/index.js'
import '../../time/index.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './input-time-root.css.js'

/**
 * @summary A time, typed or picked from a list.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger is a mark within that box rather than a button beside it,
 * the arrangement Input Date settled on.
 *
 * The panel is the field's width, which is the one place this differs from Input
 * Date: a calendar is seven columns with a width of its own, and a list of times
 * is a column of one line each, so it should be as wide as the control it
 * belongs to. That is the same reasoning Select gives for its own list.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TimePicker, TimeField, TimeInput
 * @documentation https://helix.fusion.dev/components/input-time
 *
 * @cssproperty --input-time-background-color - Fill behind the field.
 */
@customElement('helix-input-time')
export class HelixInputTime extends HelixBaseInputTime {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input-time': HelixInputTime
  }
}
