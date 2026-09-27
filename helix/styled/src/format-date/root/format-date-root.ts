import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFormatDate } from '@fusion.dev/helix-headless/format-date'
import type { CSSResultGroup } from 'lit'
import { styles } from './format-date-root.css.js'

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
 * @documentation https://fusion.dev/helix/components/format-date
 */
@customElement('helix-format-date')
export class HelixFormatDate extends HelixHeadlessFormatDate {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-format-date': HelixFormatDate
  }
}
