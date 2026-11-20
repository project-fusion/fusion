import { arrive, customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLogLine } from '@fusion.dev/helix-headless/log'
import type { CSSResultGroup } from 'lit'
import { styles } from './log-line.generated.css.js'

/**
 * @summary One line of a log, with its number, its time, and its text.
 *
 * @description
 * A row with the number, the time, and the text side by side. A line at
 * `warn` or `error` takes a band of its color, and a line `mark-lines` names
 * takes the band `Code Block` draws behind a marked line.
 *
 * @since 0.200.0
 * @status experimental
 * @documentation https://fusion.dev/helix/components/log
 *
 * @cssproperty --log-error-color - The color of a line at `error`, and of the band behind it. Defaults to the danger color.
 * @cssproperty --log-mark-background-color - The band behind a line `mark-lines` names.
 * @cssproperty --log-match-background-color - The fill behind text that matches the log's `query`.
 * @cssproperty --log-selected-background-color - The band behind a selected line, on a `selectable` log.
 * @cssproperty --log-warn-color - The color of a line at `warn`, and of the band behind it. Defaults to the warning color.
 */
@customElement('helix-log-line')
export class HelixLogLine extends HelixHeadlessLogLine {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles

  /**
   * **A line arriving fades in**, where it joins one already drawn: a frame
   * later, since the parent assigns it its slot only once it has arrived,
   * and until then it has no style for `@starting-style` to start from.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    if (this.arriving) {
      arrive(this, {
        duration: '--helix-duration-fast',
        easing: '--helix-easing-decelerate',
        from: { opacity: 0 },
      })
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-log-line': HelixLogLine
  }
}
