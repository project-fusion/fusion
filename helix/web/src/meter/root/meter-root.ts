import { customElement } from '@helix-io/core'
import { HelixBaseMeter } from '@helix-io/headless/meter'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './meter-root.css.js'

/**
 * @summary A measurement in a known range, and whether it is where you want it.
 *
 * @description
 * The bar `Progress` draws, at twice the height and on the house corner rather
 * than its pill.
 *
 * It shipped at the progress height, on the argument that the two stand beside
 * each other in a panel. Rendered side by side that turned out backwards: they
 * *are* two unrelated controls, and a reader telling a level from a task at a
 * glance is the point rather than the cost. A meter also carries more, a fill
 * and a mark at each threshold, and at eight pixels those marks are hairlines.
 * At sixteen they are unmistakable.
 *
 * The corner is the ticks' doing: they cut the fill into segments, and a
 * pill-ended bar comes out as a run whose outer ends are round and whose inner
 * ends are square. `radii-full` on an eight pixel bar was a four pixel pill
 * anyway, so this is only a change at all because the bar grew.
 *
 * What else differs is what the color means. A progress bar is one color because
 * there is one thing to say; a meter's fill takes the success, warning or danger
 * tone from the band its reading falls in, and only once thresholds have been
 * declared. An unbanded meter is neutral, because a gauge with nothing said
 * about it is a reading rather than good news.
 *
 * A tick marks each threshold, so the reading can be placed against the bands
 * without seeing color at all.
 *
 * A reading past either end squares the corner it ran out at, which is the
 * convention for a quantity continuing past the frame it is drawn in. The bar
 * itself stops, because that is what an end is; the words and the accessible
 * reading are what say how far past.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @groups charts
 * @aliases Gauge, Level, Capacity
 * @documentation https://helix.fusion.dev/components/meter
 *
 * @csspart track - The whole range.
 * @csspart indicator - The part of it the value fills.
 * @csspart tick - A mark at `low` or at `high`.
 * @csspart value - The reading, under `show-value`.
 *
 * @cssproperty --meter-ring-size - Edge length of the drawing, in `ring` and `arc`.
 * @cssproperty --meter-ring-width - Thickness of the stroke there.
 * @cssproperty --meter-color - The fill, overriding the band's own tone.
 * @cssproperty --meter-size - How thick the bar is.
 * @cssproperty --meter-tick-color - The mark at a threshold.
 * @cssproperty --meter-track-color - The groove behind the fill.
 */
@customElement('helix-meter')
export class HelixMeter extends HelixBaseMeter {
  /**
   * How much ink the reading claims.
   *
   * `subtle` is the reading as a wash of its own color: still legible, no longer
   * the loudest thing in the region. The case is a dashboard: several meters where one is the number being watched and the rest are context, which is a fact about the region rather than about any one of them and is exactly what this axis is for.
   *
   * **One value and not the four, which is the judgment this axis asks for
   * rather than a partial sweep.** `ghost` would leave a track with nothing in
   * it, which is not a quiet reading but an absent one. `outlined` is the
   * interesting refusal: `BarChart` makes it work by keeping the area and fading
   * it toward the page, so an outlined column still encodes its value, and the
   * reason it earns the value there is that a chart has other series for the
   * outlined one to be a *different kind of fact from* (a forecast, a target,
   * a budget). A meter reports one quantity against its own range, and the bands it already carries say which part of that range it is in, so there is no second kind of fact for an outline to name. `solid` is the resting state and is written by not
   * writing it, per the rule that a reflected property takes no default.
   */
  @property({ reflect: true })
  emphasis?: 'subtle'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-meter': HelixMeter
  }
}
