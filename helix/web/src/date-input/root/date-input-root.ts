import { customElement } from '@helix-io/core'
import { HelixBaseDateInput } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the headless tier's template names `helix-date-picker`
   rather than the base tag, and a custom element registers on import. Without it
   a consumer importing this one family got a panel with an unknown element in
   it: `helix-base-date-picker` was registered by the tier below and the tag being
   rendered was not, so the calendar was an empty inert box. It only ever looked
   right because the sandbox imports the whole barrel. Same arrangement Select
   uses for its listbox and Pagination for its select. */
import '../../date-picker/index.js'
import '../../tag/index.js'
import '../../icon/index.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
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
 */
@customElement('helix-date-input')
export class HelixDateInput extends HelixBaseDateInput {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-date-input': HelixDateInput
  }
}
