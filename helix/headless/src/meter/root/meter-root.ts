import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
 * is not good news; it is a reading. Declared thresholds turn the colour on.
 *
 * **And the bands are drawn as well as coloured.** A tick sits at `low` and at
 * `high`, so the reading can be placed against them without seeing colour at
 * all, which is the same call the carousel's current dot makes by lengthening
 * rather than only changing colour.
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
 */
@customElement('helix-base-meter')
export class HelixBaseMeter extends HelixElement {
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

  /** The reading. */
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

  /** How much of the track is filled, from zero to one. */
  private get fraction(): number {
    const { max, min } = this.span
    return (this.reading - min) / (max - min)
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
  private get band(): MeterBand | undefined {
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
    return this.valueText || `${Math.round(this.fraction * 100)}%`
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
    this.internals.ariaValueText = this.valueText || null
  }

  protected override render(): TemplateResult {
    const bounds = this.thresholds
    const { max, min } = this.span
    const at = (value: number): string => `${((value - min) / (max - min)) * 100}%`
    return html`<div part="track">
        ${
          bounds
            ? html`<span part="tick" style="--_meter-at: ${at(bounds.low)}"></span>
                <span part="tick" style="--_meter-at: ${at(bounds.high)}"></span>`
            : nothing
        }
        <div
          part="indicator"
          data-band=${this.band ?? nothing}
          style="--_meter-fraction: ${this.fraction}"
        ></div>
      </div>
      ${this.showValue ? html`<span part="value">${this.text}</span>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-meter': HelixBaseMeter
  }
}
