import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** Which band a value falls in, once `optimum` has said which end is good. */
export type MeterBand = 'fair' | 'good' | 'poor'

/**
 * @summary A measurement in a known range, and whether it is where you want it.
 *
 * @description
 * **Not `Progress`, and the difference is the whole component.** A progress bar
 * reports how far along a task is: it starts empty, ends full, and full is
 * always the good end. A meter reports a level in a range that is not going
 * anywhere, and which end is good is a fact about the thing being measured.
 * Disk usage, a battery, a score, a rate limit. So there is no `indeterminate`
 * here: a measurement whose value is unknown is not a measurement.
 *
 * **`low`, `high` and `optimum` are the reason it exists**, and they follow the
 * HTML specification's own rule. The three thresholds cut the range into a low
 * band, a middle and a high band, and `optimum` says which of the three is the
 * one to be in. The band the value falls in is then the good one, the one next
 * to it is fair, and the one two away is poor.
 *
 * **Without thresholds there are no bands, and this is where it parts company
 * with `<meter>`.** The platform defaults `optimum` to the midpoint and both
 * thresholds to the ends, so a bare `<meter value="20" max="100">` computes as
 * optimum and every browser paints it green. A gauge with nothing said about it
 * is not good news; it is a reading. Declared thresholds turn the color on.
 *
 * **And the bands are drawn as well as colored.** A tick sits at `low` and at
 * `high`, so the reading can be placed against them without seeing color at
 * all, which is the same call the carousel's current dot makes by lengthening
 * rather than only changing color.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Gauge, Level, Capacity
 * @documentation https://helix.fusion.dev/components/meter
 *
 * @csspart track - The whole range, or the drawing in `ring` and `arc`.
 * @csspart groove - The unfilled circle, in `ring` and `arc`.
 * @csspart indicator - The part of it the value fills.
 * @csspart tick - A mark at `low` or at `high`.
 * @csspart value - The reading, under `show-value`.
 *
 * @cssproperty --meter-along - Where a bound sits on the arc, as a length along it.
 * @cssproperty --meter-at - Where a bound sits on a linear track, as a percentage.
 * @cssproperty --meter-fraction - The value as a fraction of the range, 0 to 1.
 * @cssproperty --meter-sweep - How much of the circle the arc covers, as a path length.
 */
@customElement('helix-headless-meter')
export class HelixHeadlessMeter extends HelixElement {
  /** Accessible name for the reading. */
  @property()
  label = 'Meter'

  /** Bottom of the range. */
  @property({ type: Number })
  min = 0

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

  /** Where the reading sits between `min` and `max`. Outside them, it clamps. */
  @property({ type: Number })
  value = 0

  /** Top of the low band. Absent leaves the range unbanded. */
  @property({ type: Number })
  low?: number

  /** Bottom of the high band. Absent leaves the range unbanded. */
  @property({ type: Number })
  high?: number

  /**
   * Where in the range it is best to be.
   *
   * Defaults to the middle of whatever bands are declared, which is the
   * platform's own default and the right one for a score. A meter where low is
   * good, like disk usage, says `optimum="0"`; one where high is good, like a
   * battery, says `optimum="100"`.
   */
  @property({ type: Number })
  optimum?: number

  /**
   * The band, said outright, where the three thresholds cannot say it.
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
   * `data-band` on the fill, because that is the element being colored, so
   * reflecting here would write an attribute onto the host for no reader. Third
   * time this rule has caught something today.
   */
  @property()
  band?: MeterBand

  /**
   * Whether the reading is drawn as a bar, a ring or an arc.
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

  /** Whether the reading is shown beside the bar. */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /**
   * What the reading says, where a number is not the whole story.
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
   * **A value past the end used to be swallowed twice.** The bar filled and the
   * reading said "100%", so 110 and 250 were indistinguishable from exactly
   * full, measured. A meter that cannot say "you are over" is worse than no
   * meter for the one case anybody checks it in, and it is the same fault as a
   * pagination reporting a page it is not on: the number shown and the number
   * given disagree, quietly.
   *
   * The bar still stops at its end, because that is what an end is. The words
   * and the accessible reading carry the truth, and `data-over` is on the fill
   * so a consumer can say more about it.
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

  /** What the reading says, which is the consumer's words or a percentage. */
  private get text(): string {
    return this.valueText || `${Math.round(this.ratio * 100)}%`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const { max, min } = this.span
    /* On the host through internals, so the reading is the element itself and
       an author's own `aria-label` beats it without anything being written onto
       markup their server never had. `meter` is the ARIA role for exactly this
       and is not `progressbar`: a progress bar promises it is going somewhere. */
    hostAria(this.internals, { label: this.label, role: 'meter' })
    this.internals.ariaValueMin = String(min)
    this.internals.ariaValueMax = String(max)
    this.internals.ariaValueNow = String(this.reading)
    /* Spoken instead of the number wherever the consumer gave words, which is
       what `value-text` is for: "18 GB of 32 GB" rather than "56". */
    /* The consumer's words where they gave any, and otherwise nothing at all
       *unless* the value is past an end. `ariaValueNow` has to sit inside the
       range, so it is the only place a reader can be told that 250 is not 100. */
    this.internals.ariaValueText =
      this.valueText || (this.beyond ? `${Math.round(this.ratio * 100)}%` : null)
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
        part="indicator"
        pathLength="100"
        data-band=${this.computedBand ?? nothing}
        data-beyond=${this.beyond ?? nothing}
        style="--meter-along: ${this.fraction * sweep}"
      />
    </svg>`
  }

  protected override render(): TemplateResult {
    const bounds = this.thresholds
    const { max, min } = this.span
    const at = (value: number): string => `${((value - min) / (max - min)) * 100}%`
    return html`${
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
              part="indicator"
              data-band=${this.computedBand ?? nothing}
              data-beyond=${this.beyond ?? nothing}
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
