import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStatGroup } from '@fusion.dev/helix-headless/stat'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './stat-group.css.js'

/**
 * @summary A row of related measurements.
 *
 * @description
 * Stats wrap onto a new line when space runs out, and each figure keeps its own
 * width. Figures are read by comparing them, and equal columns would make a
 * four-digit number and a two-digit one look like the same quantity.
 *
 * Set `columns` where the stats are a set to be read across, such as three
 * facts about one thing: they then share the row equally, their labels wrap
 * within their own column, and the rule between them follows the rows.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Metrics, KPIs, Figures
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @cssproperty --stat-group-columns - An explicit track list while `columns` is set, such as one column below a width.
 * @cssproperty --stat-group-gap - Space between figures.
 */
@customElement('helix-stat-group')
export class HelixStatGroup extends HelixHeadlessStatGroup {
  /**
   * A fixed number of equal columns, from 2 to 6. Unset, the stats wrap as they fit.
   *
   * **Opted into, never the default.** Three stats whose labels ran to about
   * forty characters broke two and one at 768 pixels, the third alone on a row
   * with its rule; and a count is what a set of facts read across wants, where
   * figures compared one against another keep their own widths.
   */
  @property({ reflect: true, type: Number })
  columns?: number

  /**
   * Draws a rule between the figures, in addition to the space.
   */
  @property({ reflect: true, type: Boolean })
  divided = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-stat-group': HelixStatGroup
  }
}
