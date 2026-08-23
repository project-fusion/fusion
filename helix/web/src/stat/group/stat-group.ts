import { customElement } from '@helix-io/core'
import { HelixBaseStatGroup } from '@helix-io/headless/stat'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './stat-group.css.js'

/**
 * @summary A row of related measurements.
 *
 * @description
 * Wraps rather than scrolls, and each figure keeps its own width instead of
 * every one taking an equal share: a set of figures is read by comparing them,
 * and equal columns make a four-digit number and a two-digit one look like the
 * same quantity.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Metrics, KPIs, Figures
 * @documentation https://helix.fusion.dev/components/stat
 *
 * @cssproperty --stat-group-gap - Space between figures.
 */
@customElement('helix-stat-group')
export class HelixStatGroup extends HelixBaseStatGroup {
  /** Whether the figures are separated by a rule as well as by space. */
  @property({ reflect: true, type: Boolean })
  divided = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-stat-group': HelixStatGroup
  }
}
