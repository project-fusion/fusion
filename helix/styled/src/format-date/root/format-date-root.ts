import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFormatDate } from '@fusion.dev/helix-headless/format-date'
import type { CSSResultGroup } from 'lit'
import { styles } from './format-date-root.generated.css.js'

/**
 * @summary A timestamp, formatted for the user's locale.
 *
 * @description
 * Takes the font family, size, and color of the surrounding text. In `elapsed`
 * mode it uses `tabular-nums`, so a column of readings in a feed does not shift
 * as they count up. A date keeps proportional figures, so it sits in the text
 * like the words around it.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @use A moment shown as text, such as when a post went up or how long ago it changed.
 * @instead date-input - A date you type or pick in a form.
 * @instead time-input - A time you type or pick in a form.
 * @instead date-picker - A month calendar you choose dates on.
 * @practice Set `elapsed` in a feed, and `relative` where a reading stands alone. - In en-US, a compact 3m can mean three minutes or three months.
 * @practice Set `fields` to style one field of a date, such as the year in a lighter ink. - Without `fields`, the reading is one text with no parts inside it.
 * @documentation https://fusion.dev/helix/components/format-date
 */
@customElement('helix-format-date')
export class HelixFormatDate extends HelixHeadlessFormatDate {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-format-date': HelixFormatDate
  }
}
