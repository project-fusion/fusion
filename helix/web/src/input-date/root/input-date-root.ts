import { customElement } from '@helix-io/core'
import { HelixBaseInputDate } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './input-date-root.css.js'

/**
 * @summary A date, typed or picked from a calendar.
 *
 * @description
 * The frame is the field rather than the input, so the trigger sits inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. The trigger is a mark within that box rather than a button beside it:
 * a second frame inside the first is two controls where a reader sees one.
 *
 * The calendar is the real `helix-calendar`, in a panel with no border of its
 * own. A surface over the page is told apart by its shadow and by what it
 * covers, and a line around it as well reads as a box drawn around something
 * already separate.
 *
 * Height comes from the region, like every other control: `data-density` on
 * whatever holds it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases DatePicker, DateField, DateInput
 * @documentation https://helix.fusion.dev/components/input-date
 *
 * @cssproperty --input-date-background-color - Fill behind the field.
 */
@customElement('helix-input-date')
export class HelixInputDate extends HelixBaseInputDate {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input-date': HelixInputDate
  }
}
