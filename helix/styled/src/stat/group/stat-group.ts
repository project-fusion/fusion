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
 * @since 0.1.0
 * @status stable
 * @aliases Metrics, KPIs, Figures
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @cssproperty --stat-group-gap - Space between figures.
 */
@customElement('helix-stat-group')
export class HelixStatGroup extends HelixHeadlessStatGroup {
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
