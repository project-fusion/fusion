import {
  customElement,
  formatNumber,
  HelixElement,
  hostAria,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** A whole percentage, which a reading is written as where nothing else is asked. */
const WHOLE_PERCENT: Intl.NumberFormatOptions = { maximumFractionDigits: 0, style: 'percent' }

/** Which band a value falls in, once `optimum` has said which end is good. */
export type MeterBand = 'fair' | 'good' | 'poor'

/**
 * @summary A measurement in a known range, with optional bands that mark it good, fair, or poor.
 *
 * @description
 * A meter shows a level within a range. Use `Progress` to show how far along a
 * task is. A progress bar starts empty and ends full, and full is always the
 * good end. For a meter, which end is good depends on what is measured. There
 * is no `indeterminate`, because a meter always has a value.
 *
 * **Set `low`, `high`, and `optimum`**, as defined in the HTML specification.
 * `low` and `high` divide the range into a low band, a middle band, and a high
 * band. `optimum` sets the preferred band. The band next to it is fair, and the
 * band two away is poor.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Gauge, Level, Capacity
 * @documentation https://fusion.dev/helix/components/meter
 *
 * @slot label - A visible label. Its words name the meter in place of `label`.
 *
 * @csspart groove - The unfilled circle, in `ring` and `arc`.
 * @csspart indicator - The part of the track the value fills.
 * @csspart indicator-fair - The fill while the reading is in a band next to the good band. Set alongside `indicator`.
 * @csspart indicator-good - The fill while the reading is in the good band. Set alongside `indicator`.
 * @csspart indicator-over - The fill while the value is above `max`. Set alongside `indicator`.
 * @csspart indicator-poor - The fill while the reading is two bands from the good band. Set alongside `indicator`.
 * @csspart indicator-under - The fill while the value is below `min`. Set alongside `indicator`.
 * @csspart tick - A mark at `low` or at `high`.
 * @csspart track - The whole range, or the drawing in `ring` and `arc`.
 * @csspart value - The reading as text, shown when `show-value` is set.
 *
 * @cssproperty --meter-along - Where a bound sits on the arc, as a length along it.
 * @cssproperty --meter-at - Where a bound sits on a linear track, as a percentage.
 * @cssproperty --meter-fraction - The value as a fraction of the range, 0 to 1.
 * @cssproperty --meter-sweep - How much of the circle the arc covers, as a path length.
 */
@customElement('helix-headless-meter')
export class HelixHeadlessMeter extends HelixElement {
  /**
   * Sets the band directly, for a rule that `low`, `high`, and `optimum` cannot
   * express.
   *
   * **The specification's model has a shape, and it is worth knowing before
   * reaching for this.** Three bands and a point mean it can express a
   * *direction* in three grades, or a *target* in two, and never a target in
   * three. Measured across a grid: with `low="25" high="50" optimum="0"` the
   * readings 5, 28 and 60 come out good, fair and poor; with `low="15"
   * high="25" optimum="20"` the readings 28 and 90 both come out fair, because
   * from a middle band nothing is ever two bands away.
   *
   * So a target you can miss badly in either direction has no expression in
   * `low`, `high` and `optimum`, and neither has a rule that is not about
   * distance at all: 28 against a target of 20 is fine for a room's temperature
   * and is not fine for a dosage, and no arrangement of thresholds knows which
   * one it is looking at.
   *
   * Written, this wins outright and the thresholds are only for drawing the
   * ticks. A consumer whose rule is more than three buckets already knows the
   * answer, and asking them to encode it as thresholds so this can decode it
   * again is a worse API than letting them say it.
   *
   * Not reflected. Nothing selects on it: the band reaches the stylesheet as
   * `data-band` on the fill, because that is the element being colored, and a
   * stylesheet outside as `indicator-good`, `-fair` or `-poor` among the fill's
   * part names, so reflecting here would write an attribute onto the host for
   * no reader.
   */
  @property()
  band?: MeterBand

  /**
   * `Intl.NumberFormat` options the reading is written with, as React Aria's
   * Meter and ProgressBar take them: a unit, a currency, or a number of
   * decimals. Written as JSON in the attribute.
   *
   * ```html
   * <helix-meter value="18" max="32" format-options='{"style":"unit","unit":"gigabyte"}'></helix-meter>
   * ```
   *
   * A `percent` style writes the share of the range, and any other the value
   * itself, so the example says "18 GB", and a value past an end as it is.
   * Absent is a whole percentage. The words are announced as well as shown.
   * `value-text` still wins.
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /**
   * Bottom of the high band.
   *
   * Absent leaves the range unbanded.
   */
  @property({ type: Number })
  high?: number

  /**
   * Accessible name for the reading.
   *
   * A visible label in the `label` slot names it instead, with the words it
   * shows, so the name and the label cannot disagree.
   */
  @property()
  label = 'Meter'

  /**
   * The locale the percentage is written in, such as `fr` for `72 %`.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * Top of the low band.
   *
   * Absent leaves the range unbanded.
   */
  @property({ type: Number })
  low?: number

  /**
   * Top of the range.
   *
   * A hundred rather than the platform's one, which is what `Progress` already
   * takes and what a consumer writing `value="72"` means. A range of zero to one
   * is a fraction, and a component that reads `value="72"` as seventy-two times
   * over its maximum is a trap that costs nothing to avoid.
   */
  @property({ type: Number })
  max = 100

  /**
   * Bottom of the range.
   */
  @property({ type: Number })
  min = 0

  /**
   * The point in the range where the reading is best.
   *
   * Defaults to the middle of whatever bands are declared, which is the
   * platform's own default and the right one for a score. A meter where low is
   * good, like disk usage, says `optimum="0"`; one where high is good, like a
   * battery, says `optimum="100"`.
   */
  @property({ type: Number })
  optimum?: number

  /**
   * Whether the reading is drawn as a bar, a ring, or an arc.
   *
   * A gauge and a meter are the same thing measured: a value in a range, with
   * bands saying which part of it is the good part. What differs between the two
   * words in practice is the drawing, so this is a shape rather than a second
   * component, the same call `Progress` made with its ring and `Skeleton` with
   * its own shapes.
   *
   * A bar is right in a row of them, in a table, or under a label. A ring is
   * right in a tile, where the number goes in the middle. An arc is the shape a
   * dashboard gauge has always had: open at the bottom, so the two ends of the
   * range have somewhere to be that is not each other.
   *
   * There is no needle in any of them. A needle is a picture of an instrument
   * rather than a reading, it costs a rotation and a shape to draw it with, and
   * it says nothing the end of the arc does not already say.
   */
  @property({ reflect: true })
  shape?: 'arc' | 'ring'

  /**
   * Whether the reading is shown beside the bar.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /**
   * Where the reading sits between `min` and `max`.
   *
   * Outside them, it clamps.
   */
  @property({ type: Number })
  value = 0

  /**
   * Text that screen readers announce and the meter shows for the reading, in
   * place of the percentage.
   *
   * `value-text="18 GB of 32 GB"` is announced and shown instead of `56%`. The
   * same property `Progress` carries, for the same reason: a percentage is a
   * fair summary of a task and a poor one of a quantity.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /** The range, clamped so `max` is never at or below `min`. */
  private get span(): { max: number; min: number } {
    const min = Number.isFinite(this.min) ? this.min : 0
    const max = Number.isFinite(this.max) && this.max > min ? this.max : min + 1
    return { max, min }
  }

  /** The reading, pulled into the range. */
  private get reading(): number {
    const { max, min } = this.span
    return Math.min(max, Math.max(min, Number.isFinite(this.value) ? this.value : min))
  }

  /**
   * How much of the track is filled, from zero to one.
   *
   * Clamped, because a bar cannot draw past its own end. What the reading *says*
   * is not clamped: see `ratio`.
   */
  private get fraction(): number {
    const { max, min } = this.span
    return (this.reading - min) / (max - min)
  }

  /**
   * Where the value really sits, which is what the words report.
   *
   * **Unclamped, so a value past the end is not swallowed.** Clamped as well as
   * the bar is, 110 and 250 read as exactly full, and a meter that cannot say
   * "you are over" is worse than no meter for the one case anybody checks it in.
   *
   * The bar still stops at its end, because that is what an end is. The words
   * and the accessible reading carry the truth, and the fill carries
   * `indicator-over` or `indicator-under` among its part names so a consumer can
   * say more about it.
   */
  private get ratio(): number {
    const { max, min } = this.span
    const raw = Number.isFinite(this.value) ? this.value : min
    return (raw - min) / (max - min)
  }

  /** Whether the value is past an end, which the bar itself cannot show. */
  private get beyond(): 'over' | 'under' | undefined {
    const { max, min } = this.span
    const raw = Number.isFinite(this.value) ? this.value : min
    return raw > max ? 'over' : raw < min ? 'under' : undefined
  }

  /**
   * The thresholds, in order, or nothing where the consumer declared none.
   *
   * Both are clamped into the range and to each other, because a `low` above a
   * `high` describes no bands at all and the spec's own answer is to raise the
   * one that is out of order rather than to give up.
   */
  private get thresholds(): { high: number; low: number } | undefined {
    const { max, min } = this.span
    if (this.low === undefined && this.high === undefined) {
      return undefined
    }
    const low = Math.min(max, Math.max(min, this.low ?? min))
    const high = Math.min(max, Math.max(low, this.high ?? max))
    return { high, low }
  }

  /**
   * Which band the reading is in, by the specification's rule.
   *
   * `optimum` names a point, and the band containing it is the good one. A
   * reading in that band is good, one in a band beside it is fair, and one two
   * bands away is poor. Undefined where nothing was declared, which is what
   * keeps an unbanded meter from being painted as good news.
   */
  private get computedBand(): MeterBand | undefined {
    if (this.band) {
      return this.band
    }
    const bounds = this.thresholds
    if (!bounds) {
      return undefined
    }
    const { max, min } = this.span
    const optimum = Math.min(max, Math.max(min, this.optimum ?? (bounds.low + bounds.high) / 2))
    const which = (at: number): number => (at < bounds.low ? 0 : at > bounds.high ? 2 : 1)
    const distance = Math.abs(which(this.reading) - which(optimum))
    return distance === 0 ? 'good' : distance === 1 ? 'fair' : 'poor'
  }

  /**
   * What the reading says: the consumer's words, or the reading in
   * `format-options`, a share of the range for a percent and the value for
   * anything else.
   */
  private get text(): string {
    const options = this.formatOptions
    return (
      this.valueText ||
      (options && options.style !== 'percent'
        ? formatNumber(
            Number.isFinite(this.value) ? this.value : this.span.min,
            this.locale,
            options,
          )
        : formatNumber(this.ratio, this.locale, options ?? WHOLE_PERCENT))
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const { max, min } = this.span
    /* On the host through internals, so the reading is the element itself and
       an author's own `aria-label` beats it without anything being written onto
       markup their server never had. `meter` is the ARIA role for exactly this
       and is not `progressbar`: a progress bar promises it is going somewhere. */
    hostAria(this.internals, { label: slottedWords(this, ['label']) || this.label, role: 'meter' })
    this.internals.ariaValueMin = String(min)
    this.internals.ariaValueMax = String(max)
    this.internals.ariaValueNow = String(this.reading)
    /* The consumer's words where they gave any, and otherwise nothing at all
       *unless* the value is past an end. `ariaValueNow` has to sit inside the
       range, so it is the only place a reader can be told that 250 is not 100.
       Under `format-options` the words shown are the words said. */
    this.internals.ariaValueText =
      this.valueText || this.formatOptions !== undefined || this.beyond ? this.text : null
  }

  /**
   * The same reading, drawn round.
   *
   * `pathLength="100"` is what makes every number here a percentage: the path is
   * declared a hundred units long, so nothing computes a circumference, a radius
   * or pi, and a consumer changing the thickness moves the circle that carries
   * it without this element recalculating anything. Progress does the same and
   * for the same reason.
   *
   * The sweep is what separates the two shapes. A ring is the whole circle and
   * an arc is three quarters of it, open at the bottom, which is where a gauge
   * has always had its gap: the two ends need somewhere to be that is not each
   * other, and the opening is where a reading of the value goes.
   *
   * Ticks are segments of the same circle rather than marks placed on it. One
   * unit of a hundred, offset to where the threshold falls, which needs no
   * trigonometry and stays correct at any radius or thickness. Placing them by
   * hand would mean sine and cosine in a template and a second definition of
   * where the arc starts.
   */
  private renderRound(): TemplateResult {
    const bounds = this.thresholds
    const band = this.computedBand
    const beyond = this.beyond
    const { max, min } = this.span
    const sweep = this.shape === 'arc' ? 75 : 100
    const along = (value: number): number => ((value - min) / (max - min)) * sweep
    return html`<svg part="track" viewBox="0 0 100 100" aria-hidden="true">
      <circle part="groove" pathLength="100" style="--meter-sweep: ${sweep}" />
      ${
        /* `svg` and not `html`, which is the bug the sparkline records one
           file over. A nested Lit template is parsed on its own, so a
           `<circle>` written in one has no `<svg>` around it and lands in the
           XHTML namespace: it takes the part, takes the style, inherits every
           rule in the stylesheet, and draws nothing, because geometry belongs
           to the namespace and not to the tag name. Both threshold ticks were
           invisible in `shape="ring"` and `shape="arc"`, which is the whole of
           what the round example shows. */
        bounds
          ? svg`<circle
                part="tick"
                pathLength="100"
                style="--meter-along: ${along(bounds.low)}"
              />
              <circle part="tick" pathLength="100" style="--meter-along: ${along(bounds.high)}" />`
          : nothing
      }
      <circle
        part="indicator${band ? { fair: ' indicator-fair', good: ' indicator-good', poor: ' indicator-poor' }[band] : ''}${beyond ? { over: ' indicator-over', under: ' indicator-under' }[beyond] : ''}"
        pathLength="100"
        data-band=${band ?? nothing}
        data-beyond=${beyond ?? nothing}
        style="--meter-along: ${this.fraction * sweep}"
      />
    </svg>`
  }

  /** A label's words changed, so the name is written again. */
  private readonly renamed = (): void => {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    const bounds = this.thresholds
    const band = this.computedBand
    const beyond = this.beyond
    const { max, min } = this.span
    const at = (value: number): string => `${((value - min) / (max - min)) * 100}%`
    /* A bare slot, so one with no label generates the box it always did.
       A label arriving later renames the host, which `slotchange` asks for. */
    return html`<slot name="label" @slotchange=${this.renamed}></slot>${
      this.shape
        ? this.renderRound()
        : html`<div part="track">
            ${
              bounds
                ? html`<span part="tick" style="--meter-at: ${at(bounds.low)}"></span>
                    <span part="tick" style="--meter-at: ${at(bounds.high)}"></span>`
                : nothing
            }
            <div
              part="indicator${band ? { fair: ' indicator-fair', good: ' indicator-good', poor: ' indicator-poor' }[band] : ''}${beyond ? { over: ' indicator-over', under: ' indicator-under' }[beyond] : ''}"
              data-band=${band ?? nothing}
              data-beyond=${beyond ?? nothing}
              style="--meter-fraction: ${this.fraction}"
            ></div>
          </div>`
    }
      ${this.showValue ? html`<span part="value">${this.text}</span>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-meter': HelixHeadlessMeter
  }
}
