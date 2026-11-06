import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStat } from '@fusion.dev/helix-headless/stat'
import type { CSSResultGroup } from 'lit'
import { styles } from './stat-root.generated.css.js'

/**
 * @summary One measurement, with a label that names what it measures.
 *
 * @description
 * The value uses the display typeface at a size above the type scale, because
 * the figure is the focus. The label sits above it in the label style, small
 * and widely tracked, so the pair reads as one unit.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI
 * @use One measurement with a label, such as active users on a dashboard.
 * @instead badge - A count pinned to another element.
 * @instead meter - A measurement shown against a known range.
 * @instead sliding-number - A figure whose digits roll to each new value.
 * @anatomy label
 * @anatomy value
 * @anatomy group?
 * @practice {trend} Put a Trend in the `trend` slot. - It is read inside the stat's group, after the figure it qualifies.
 * @practice {counting} Set `value` for a figure a dashboard refreshes. - A new `value` counts from the one before, so the figure reads as having moved, and a slotted figure changes at once.
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @csspart value - The slot the value is written in, or the figure the stat writes from `value` or from slotted text. A slot draws no box, so it takes the inherited properties, such as color and font, and passes them to the value.
 *
 * @cssproperty --stat-count-duration - How long a new `value` takes to count from the one before. Defaults to `--helix-duration-slow`. `0ms` changes the figure at once.
 * @cssproperty --stat-count-easing - The curve a new `value` counts along. Defaults to `--helix-easing-decelerate`, so the figure slows as it arrives.
 * @cssproperty --stat-gap - Space between the label and the value, and between the value and the unit in a row.
 * @cssproperty --stat-label-color - Color of the label.
 * @cssproperty --stat-label-size - Size of the label.
 * @cssproperty --stat-unit-color - Color of the unit.
 * @cssproperty --stat-unit-size - Size of the unit.
 * @cssproperty --stat-value-color - Color of the figure.
 * @cssproperty --stat-value-size - Size of the figure.
 */
@customElement('helix-stat')
export class HelixStat extends HelixHeadlessStat {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-stat': HelixStat
  }
}
