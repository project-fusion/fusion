import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMeter } from '@fusion.dev/helix-headless/meter'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './meter-root.css.js'

/**
 * @summary A measurement in a known range, with optional bands that mark it good, fair, or poor.
 *
 * @description
 * Draws the same bar as `Progress`, at twice the height, with the library's
 * standard corner radius in place of the pill shape.
 *
 * The extra height makes a meter easy to tell apart from a progress bar and
 * keeps the tick at each threshold visible. At eight pixels the ticks are
 * hairlines. At sixteen they are clear. The ticks cut the fill into segments,
 * which is why the corners are square: a pill-shaped bar would have round outer
 * ends and square inner ends.
 *
 * Once you set thresholds, the fill takes the success, warning, or danger tone
 * of the band the reading falls in. A meter with no thresholds is neutral. A
 * tick marks each threshold, so the reading can be placed against the bands
 * without relying on color.
 *
 * A reading past either end squares the corner on that side, the convention for
 * a quantity that continues past its frame. The bar stops at the end, and the
 * text and the accessible value give the actual reading.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @groups charts
 * @aliases Gauge, Level, Capacity
 * @documentation https://fusion.dev/helix/components/meter
 *
 * @csspart indicator - The part of the track the value fills.
 * @csspart indicator-fair - The fill while the reading is in a band next to the good band. Set alongside `indicator`.
 * @csspart indicator-good - The fill while the reading is in the good band. Set alongside `indicator`.
 * @csspart indicator-over - The fill while the value is above `max`. Set alongside `indicator`.
 * @csspart indicator-poor - The fill while the reading is two bands from the good band. Set alongside `indicator`.
 * @csspart indicator-under - The fill while the value is below `min`. Set alongside `indicator`.
 * @csspart tick - A mark at `low` or at `high`.
 * @csspart track - The whole range.
 * @csspart value - The reading as text, shown when `show-value` is set.
 *
 * @cssproperty --meter-color - The fill color. Overrides the band's tone.
 * @cssproperty --meter-ring-size - The width and height of the drawing in `ring` and `arc`.
 * @cssproperty --meter-ring-width - The thickness of the stroke in `ring` and `arc`.
 * @cssproperty --meter-size - The thickness of the bar.
 * @cssproperty --meter-tick-color - The color of the mark at each threshold.
 * @cssproperty --meter-track-color - The color of the groove behind the fill.
 */
@customElement('helix-meter')
export class HelixMeter extends HelixHeadlessMeter {
  /**
   * How strongly the reading is drawn. `subtle` draws it as a wash of its color.
   *
   * `subtle` is the reading as a wash of its own color: still legible, no longer
   * the loudest thing in the region. The case is a dashboard of several meters
   * where one is the number being watched and the rest are context, which is a
   * fact about the region rather than about any one of them.
   *
   * **One value of the five.** `ghost` would leave a track with nothing in
   * it, which is not a quiet reading but an absent one. `muted` is the quiet
   * ink `Text` takes and a reading draws a fill rather than ink, so `subtle` is
   * the whole of what quiet means here. `outlined` earns its
   * place in `BarChart`, which keeps the area and fades it toward the page, only
   * because a chart has other series for the outlined one to be a *different
   * kind of fact from* (a forecast, a target, a budget). A meter reports one
   * quantity against its own range, and the bands it carries already say which
   * part of that range it is in, so there is no second kind of fact for an
   * outline to name. `solid` is the resting state and is written by not writing
   * it, per the rule that a reflected property takes no default.
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
