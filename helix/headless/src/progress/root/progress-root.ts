import {
  customElement,
  drawStatus,
  HelixCompleteEvent,
  HelixElement,
  hostAria,
  readingText,
  StatusController,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A bar or ring that shows how far along a task is.
 *
 * @description
 * Determinate by default. Set `indeterminate` for a task whose total is not
 * known yet. Use `Loader` for a short wait or one with no place of its own on
 * the page.
 *
 * The indeterminate bar runs a segment across the track and does not fill, so
 * it shows that work is happening without claiming a proportion.
 * `aria-valuenow` is omitted in that state, which is the platform's signal for
 * the same thing.
 *
 * The fill is a fraction of the track, written as a custom property.
 *
 * **Reaching `max` is said and sent.** When the value arrives at `max` from
 * below, the bar says `complete-label`, "Complete" by default, in a polite
 * `live` region and sends `helix-complete`, so a reader hears that the work is
 * done and a page can move on. A bar that starts full says nothing, and an
 * empty `complete-label` keeps it quiet. The `complete` custom state is set
 * while the bar is full.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Progress bar, Loading bar
 * @documentation https://fusion.dev/helix/components/progress
 *
 * @slot label - A visible label. Its words name the progress bar in place of `label`.
 *
 * @event {HelixCompleteEvent} helix-complete - The value reached `max` from below. Its `value` is `max`. Not sent for a bar that starts full.
 *
 * @csspart groove - The unfilled circle under the ring's filled arc.
 * @csspart indicator - The filled part that shows the work done.
 * @csspart live - A polite region that says `complete-label` when the work is done, rendered from that moment. Hide it visually.
 * @csspart track - The full length the work is measured against.
 * @csspart value - The value shown beside the bar when `show-value` is set.
 *
 * @cssproperty --progress-fraction - The value as a fraction of the range, 0 to 1. Pinned to 1 while indeterminate.
 *
 * @cssstate complete - The value is at `max` and the bar is not indeterminate.
 */
@customElement('helix-headless-progress')
export class HelixHeadlessProgress extends HelixElement {
  /**
   * The words a screen reader hears when the value reaches `max`, such as
   * "Upload complete".
   *
   * Said once, politely, as the work finishes. Empty says nothing, for a bar
   * whose page announces the result itself.
   */
  @property({ attribute: 'complete-label' })
  completeLabel = 'Complete'

  /**
   * `Intl.NumberFormat` options the reading is written with, as React Aria's
   * Meter and ProgressBar take them: a unit, a currency, or a number of
   * decimals. Written as JSON in the attribute.
   *
   * ```html
   * <helix-progress value="18" max="32" format-options='{"style":"unit","unit":"gigabyte"}'></helix-progress>
   * ```
   *
   * A `percent` style writes the share of the range, and any other the value
   * itself, so the example says "18 GB". Absent is a whole percentage. The
   * words are announced as well as shown. `value-text` still wins.
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /**
   * Whether the length of the task is unknown. The bar then shows activity
   * without a value.
   *
   * On the headless tier rather than as a treatment, because it is
   * semantics before it is a picture: a progressbar with no `aria-valuenow` is
   * how the platform says "running, and nobody knows how far", and a reader on
   * a screen reader is told that rather than being read a number that means
   * nothing. `value` and `max` are ignored while it is set.
   *
   * Not `Loader`, which is the other thing this could be. A loader says the
   * page is busy; a bar says a named piece of work is running, and keeps its
   * place in the layout when the answer arrives and it becomes determinate.
   */
  @property({ reflect: true, type: Boolean })
  indeterminate = false

  /**
   * Accessible name for what is in progress.
   *
   * A visible label in the `label` slot names it instead, with the words it
   * shows, so the name and the label cannot disagree.
   */
  @property()
  label = 'Progress'

  /**
   * The locale the percentage is written in, such as `fr` for `72 %`.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * The total the work is measured against.
   */
  @property({ type: Number })
  max = 100

  /**
   * Where the work starts, in the same units as `max`. Defaults to zero.
   *
   * For a measure that does not start at nothing, such as a migration from
   * version 12 to version 20, where 12 is the empty bar.
   */
  @property({ type: Number })
  min = 0

  /**
   * Whether the value is drawn as a bar or as a ring.
   *
   * **On this tier because it changes the markup**, which is the headless tier's to
   * own. A bar is two boxes and a ring is an SVG with two circles in it, and no
   * stylesheet turns one into the other: the styled tier tried, with a conic
   * gradient and a mask, and the thing it could not do was the round end the
   * loader has, because a gradient has hard radial edges and no notion of a
   * cap. `Skeleton.shape` is the same word for the same kind of decision.
   *
   * The value, the ARIA and the form participation are untouched by it. What
   * changes is only which shape carries the fraction.
   */
  @property({ reflect: true })
  shape?: 'ring'

  /**
   * Whether the reading is shown beside the bar.
   *
   * The same name and shape `Slider` uses, because it is the same question:
   * a control that holds a number can either show it or leave it to whatever is
   * around it. Off by default, since most bars sit under a label that already
   * says what is happening and a second number is noise.
   *
   * Nothing under `indeterminate`, where there is no reading to show: a percent
   * that does not move is worse than none, and `valueText` is the property for
   * saying "uploading" while the bar runs.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /**
   * What has been done so far, in the same units as `max`.
   *
   * Clamped between `min` and `max` for both the fill and the announcement, so
   * the two can never disagree about what is on screen.
   */
  @property({ type: Number })
  value = 0

  /**
   * Text that describes the value when the number alone is not enough, such as
   * "3 of 8 files".
   *
   * "3 of 8 files" rather than "37". Announced instead of the percentage, and
   * never instead of the value itself: `aria-valuenow` still carries the
   * number, because assistive technology that ignores the text still has to
   * report progress.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /** The region the bar says `complete-label` in, rendered from the first time it does. */
  private readonly status = new StatusController(this)

  /** Whether the bar was full at the last update, or unknown before the first. */
  private wasComplete: boolean | undefined

  /** Whether the work is done: determinate and at `max`. */
  private get complete(): boolean {
    return !this.indeterminate && this.fraction >= 1
  }

  /** The range the value is measured in, with a top above its bottom. */
  private get range(): { max: number; min: number } {
    const min = Number.isFinite(this.min) ? this.min : 0
    return { max: this.max > min ? this.max : min + 100, min }
  }

  /** What is done, as a fraction of the whole, between 0 and 1. */
  get fraction(): number {
    const { max, min } = this.range
    /* `|| 0` catches the value that is not a number.
     *
     * `undefined / 100` is `NaN`, `Math.min(Math.max(NaN, 0), 1)` is `NaN`, and
     * `NaN` reached CSS as `scale: NaN`, which is an invalid value the
     * declaration is dropped for: the bar fell back to its unscaled width and
     * painted COMPLETE for a value nobody had given. `aria-valuenow` announced
     * the string "NaN" beside it. Empty means nothing done, which is the only
     * reading that is not a claim. */
    return Math.min(Math.max((this.value - min) / (max - min), 0), 1) || 0
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, {
      label: slottedWords(this, ['label']) || this.label,
      role: 'progressbar',
    })
    /* The clamped value, not the given one, so what is announced is what is
       drawn. Written as strings because that is what `ElementInternals` takes;
       a number assigned here is stringified anyway and reads as though the
       type were checked. */
    const { max, min } = this.range
    this.internals.ariaValueMin = String(min)
    this.internals.ariaValueMax = String(max)
    /* Absent while indeterminate, not zero. An omitted `aria-valuenow` is the
     * platform's own signal for indeterminate, and it is the only one:
     * `aria-busy` says the element is being updated, which is a different claim.
     * Reporting 0 would announce "0 percent" for work that is running, which is
     * worse than saying nothing because it is wrong rather than unknown.
     *
     * Otherwise the clamped value itself, never the fraction multiplied back up.
     * Dividing by `max` and then multiplying by it is a round trip through a
     * float, and for roughly one integer pair in sixteen it does not come back:
     * `1/3*3` is `0.9999999999999998`, which is what the accessibility tree
     * carried and what a screen reader read out. */
    this.internals.ariaValueNow = this.indeterminate
      ? null
      : String(Math.min(Math.max(this.value || min, min), max))
    this.internals.ariaValueText =
      this.valueText || (this.formatOptions !== undefined && !this.indeterminate ? this.text : null)
    this.toggleState('complete', this.complete)
  }

  /* Arriving at `max` from below is news; starting there is not, so the first
     update only records where the bar stands. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const complete = this.complete
    const arrived = complete && this.wasComplete === false
    this.wasComplete = complete
    if (!arrived) {
      return
    }
    if (this.completeLabel !== '') {
      this.status.say(this.completeLabel)
    }
    this.dispatchEvent(new HelixCompleteEvent({ value: String(this.range.max) }))
  }

  /**
   * What the bar says: the consumer's words, or the reading in
   * `format-options`, a share of the range for a percent and the value for
   * anything else.
   */
  private get text(): string {
    return (
      this.valueText ||
      readingText(
        Math.min(Math.max(this.value, this.range.min), this.range.max),
        this.fraction,
        this.locale,
        this.formatOptions,
      )
    )
  }

  /** A label's words changed, so the name is written again. */
  private readonly renamed = (): void => {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    /* A custom property rather than a width, so the styled tier decides what
       the number means: a bar fills along it, and a ring would sweep. */
    const fraction = this.indeterminate ? 1 : this.fraction

    /* Two circles and `pathLength`, which is what makes the arithmetic go away.
     *
     * Declaring the path 100 units long lets `stroke-dasharray` be written as
     * the percentage itself, so nothing here or in the stylesheet needs the
     * circumference, the radius or pi. The geometry is CSS as well: `r` and the
     * stroke both read the ring's own custom properties, so a consumer changing
     * the thickness moves the circle that carries it without the component
     * recalculating anything.
     *
     * `aria-hidden`, because the host is the `progressbar` and carries the
     * value. The drawing is a picture of what it already says. */
    const ring = html`<svg part="track" aria-hidden="true">
      <circle part="groove" />
      <circle part="indicator" pathLength="100" style="--progress-fraction: ${fraction}" />
    </svg>`

    /* A bare slot, so one with no label generates the box it always did.
       A label arriving later renames the host, which `slotchange` asks for. */
    return html`<slot name="label" @slotchange=${this.renamed}></slot>${
      this.shape === 'ring'
        ? ring
        : html`<div part="track">
            <div part="indicator" style="--progress-fraction: ${fraction}"></div>
          </div>`
    }
      ${
        /* `aria-hidden`, because the bar already reports this. The host carries
           `role="progressbar"` with `aria-valuenow` and `aria-valuetext`, so a
           readable copy of the same number is a second announcement of one
           fact. It is here to be looked at, not to be read out. */
        this.showValue && !this.indeterminate
          ? html`<span part="value" aria-hidden="true"
              >${this.text}</span
            >`
          : ''
      }${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-progress': HelixHeadlessProgress
  }
}
