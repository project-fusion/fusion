import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDateInput } from '@fusion.dev/helix-headless/date-input'
import type { CSSResultGroup } from 'lit'
/* The headless template names `helix-date-picker` rather than the base tag, so
   without this a consumer importing this family alone got a panel whose calendar
   was an empty inert box. It looked right only because the sandbox imports the
   whole barrel. Same arrangement Select uses for its listbox. */
import '../../date-picker/index.js'
import '../../tag/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './date-input-root.css.js'

/**
 * @summary A date, typed or picked from a calendar.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger is a mark within that box rather than a button beside it:
 * a second frame inside the first is two controls where a reader sees one.
 *
 * The calendar is the real `helix-date-picker`, in a panel with no border of its
 * own. A surface over the page is told apart by its shadow and by what it
 * covers, and a line around it as well reads as a box drawn around something
 * already separate.
 *
 * Height comes from the region, like every other control: `data-density` on
 * whatever holds it.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases DatePicker, DateField, InputDate
 * @documentation https://helix.fusion.dev/components/date-input
 *
 * @cssproperty --date-input-background-color - Fill behind the field.
 * @cssproperty --date-input-border-color - Color of the panel's edge.
 * @cssproperty --date-input-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --date-input-shadow - Lift under the panel. Follows `--helix-shadow-floating`:
 *   a floating surface sits over content nobody can predict, so it keeps a lift by default.
 */
@customElement('helix-date-input')
export class HelixDateInput extends HelixHeadlessDateInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-date-input': HelixDateInput
  }
}
