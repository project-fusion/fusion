import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMeterSegment } from '@fusion.dev/helix-headless/meter'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './meter-segment.generated.css.js'

/**
 * @summary One share of a meter's whole, drawn as a slice of its bar.
 *
 * @description
 * Each segment takes the next color in the chart series, in the order written, so
 * two of them are told apart without being given a color. A `tone` is what a
 * segment means, and takes the place of its turn. A hairline in the track's ground
 * sits between neighbors, so the boundary is there for a reader who cannot tell
 * two of the colors apart.
 *
 * Write the segments inside a meter, and the page imports the family beside it:
 *
 * ```js
 * import '@fusion.dev/helix/meter'
 * ```
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @groups charts
 * @documentation https://fusion.dev/helix/components/meter
 *
 * @csspart fill - The slice of the bar the segment takes.
 *
 * @cssproperty --meter-segment-color - The slice's color. Overrides the series and the tone.
 * @cssproperty --meter-segment-gap-color - The color of the hairline between neighbors.
 *
 * @replaces meter-segment
 */
@customElement('helix-meter-segment')
export class HelixMeterSegment extends HelixHeadlessMeterSegment {
  static override styles: CSSResultGroup = styles

  /**
   * What the segment means, as it does on a callout. Takes the tone's color in
   * place of the next color in the series.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-meter-segment': HelixMeterSegment
  }
}
