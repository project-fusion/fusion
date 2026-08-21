import { customElement } from '@helix-io/core'
import { HelixBaseChartLegend } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './chart-legend-root.css.js'

/**
 * @summary The names a chart draws, each beside the colour it is drawn in.
 *
 * @description
 * A row that wraps, because a legend sits under a chart as wide as the chart
 * and there is no arrangement of eight names that fits every width. Set
 * `--chart-legend-direction` to `column` where it sits beside one instead.
 *
 * The eight series colours are mapped here rather than in the tier below, which
 * carries the index and holds no tokens. Written as eight rules for the reason
 * `Avatar.Group` writes twelve: an index in markup cannot select a token, and a
 * custom property set inline would be the headless tier naming a colour.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Key, Series Key
 * @documentation https://helix.fusion.dev/components/chart-legend
 *
 * @cssproperty --chart-legend-direction - `row`, which wraps, or `column`.
 * @cssproperty --chart-legend-gap - Space between entries.
 * @cssproperty --chart-legend-swatch-size - Size of the colour patch.
 */
@customElement('helix-chart-legend')
export class HelixChartLegend extends HelixBaseChartLegend {
  static override styles: CSSResultGroup = styles

  /**
   * Where the legend sits and which way its entries run.
   *
   * Absent is a wrapping row, which is what sits under a chart. `start` and
   * `end` stack the entries in a column, for a legend beside one.
   *
   * **This says which way the entries run and not where the element is**, which
   * is the honest limit of a component that is a sibling of the chart rather
   * than part of it. A legend cannot place itself relative to something it is
   * not inside, so the consumer still puts it above, below or beside; this
   * makes it lay out correctly once it is there, which was the part that
   * previously took a custom property nobody would guess at.
   *
   * The alternative was a `legend` slot on every chart, so a chart could place
   * its own. That is worse: it makes the legend's position a fact about the
   * chart, so two charts sharing one legend becomes impossible, and it puts a
   * list inside a drawing that is `aria-hidden`.
   */
  @property({ reflect: true })
  placement?: 'end' | 'start'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chart-legend': HelixChartLegend
  }
}
