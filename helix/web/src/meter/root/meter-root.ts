import { customElement } from '@helix-io/core'
import { HelixBaseMeter } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './meter-root.css.js'

/**
 * @summary A measurement in a known range, and whether it is where you want it.
 *
 * @description
 * The bar `Progress` draws, at the same height and with the same corner, because
 * the two stand beside each other in a panel and a reading that sits differently
 * in each reads as two unrelated controls.
 *
 * What differs is what the colour means. A progress bar is one colour because
 * there is one thing to say; a meter's fill takes the success, warning or danger
 * tone from the band its reading falls in, and only once thresholds have been
 * declared. An unbanded meter is neutral, because a gauge with nothing said
 * about it is a reading rather than good news.
 *
 * A tick marks each threshold, so the reading can be placed against the bands
 * without seeing colour at all.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Gauge, Level, Capacity
 * @documentation https://helix.fusion.dev/components/meter
 *
 * @csspart track - The whole range.
 * @csspart indicator - The part of it the value fills.
 * @csspart tick - A mark at `low` or at `high`.
 * @csspart value - The reading, under `show-value`.
 *
 * @cssproperty --meter-color - The fill, overriding the band's own tone.
 * @cssproperty --meter-size - How thick the bar is.
 * @cssproperty --meter-tick-color - The mark at a threshold.
 * @cssproperty --meter-track-color - The groove behind the fill.
 */
@customElement('helix-meter')
export class HelixMeter extends HelixBaseMeter {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-meter': HelixMeter
  }
}
