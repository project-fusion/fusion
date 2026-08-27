import { customElement } from '@helix-io/core'
import { HelixHeadlessFormatDate } from '@helix-io/headless/format-date'
import type { CSSResultGroup } from 'lit'
import { styles } from './format-date-root.css.js'

/**
 * @summary A timestamp, written the way the reader's locale writes one.
 *
 * @description
 * The base tier does the reading; this adds the one thing a design system has to
 * say about it. A timestamp takes the family, size and color of the text around
 * it, so almost nothing here is a decision. The exception is figures: an elapsed
 * reading counts up under the reader, and proportional digits move the trailing
 * edge as it does, which in a feed is a whole column shifting whenever any row
 * in it ticks over. `tabular-nums` in that mode and not in the other, because a
 * date is written once and should sit in the text like the text.
 *
 * @since 0.1.0
 * @status experimental
 * @category typography
 * @documentation https://helix.fusion.dev/components/format-date
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
