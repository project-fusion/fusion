import {
  AriaForwardController,
  customElement,
  fillTemplate,
  formatNumber,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A value chosen from a range by dragging.
 *
 * @description
 * Renders a native `<input type="range">`, so the drag, the arrow keys, Home,
 * End, the page keys, and the touch target come from the platform. A native
 * range has a hit area larger than its thumb, sized for a finger.
 *
 * The value is a string, like every other form control's, and
 * `MixinControllerValue` holds text. Use `valueAsNumber` for arithmetic.
 *
 * Marks are drawn by the component. The ticks of a `<datalist>` cannot be
 * styled, and Firefox does not render them for a range. Marks are decoration.
 * `step` sets where the value can land, and the input enforces it whether or
 * not marks are drawn. `markers` is a count, so a slider from zero to a hundred
 * does not draw a hundred and one marks by accident.
 *
 * A range with two thumbs is two inputs stacked on one track, because there is
 * no native two-thumb range. Each thumb keeps its own value.
 * `min-steps-between-thumbs` keeps them that many steps apart, and the readout
 * joins the two as `range-text` writes them.
 *
 * `origin` sets where a single thumb's fill starts: at `min`, at the middle of
 * the track, or at `max`. A balance or an offset from zero fills from the
 * middle, as Zag's slider `origin` does. The fill's ends are published as
 * `--slider-from` and `--slider-to`.
 *
 * `format-options` writes the value with `Intl.NumberFormat` in `locale`, as a
 * currency, a percent or a unit, and `formatter` writes it with a function of
 * your own, such as words for a scale. Either one is what a screen reader
 * hears, what the readout shows and what the marker labels say. `value-text`
 * still wraps it in a sentence, with the formatted value in its place.
 *
 * `required` comes with the field mixin and cannot fail. A range is never
 * empty: the platform shows its midpoint when no value is set, and `willUpdate`
 * seeds that midpoint into `defaultValue`, so the value matches the handle from
 * the first render. HTML does not apply `required` to a range either, so it is
 * not set on the input. It only adds the marker beside the label.
 *
 * **Keyboard.** Each thumb is one tab stop, and its keys are the native
 * range's.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Up | Moves the thumb up by `step`. |
 * | Left, Down | Moves the thumb down by `step`. |
 * | Page Up, Page Down | Moves the thumb by a larger step. |
 * | Home, End | Moves the thumb to its lowest or highest value. |
 *
 * Each thumb is an `<input type="range">` with `aria-valuetext` where the value
 * is formatted or worded. A range's thumbs say they stop at each other with
 * `aria-valuemin` and `aria-valuemax`.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Range, Range input
 * @documentation https://fusion.dev/helix/components/slider
 *
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 *
 * @event {Event} change - Fired when the user releases the thumb.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the value changes. Cancelable: call `preventDefault()` to keep the current value.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart control - The range input.
 * @csspart feedback - The error message under the track.
 * @csspart field - The row that holds the control and its readout.
 * @csspart hint - The help text under the track, shown while there is no error.
 * @csspart label - The label above the track.
 * @csspart marker - One mark on the track.
 * @csspart marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart markers - The row of marks along the track.
 * @csspart output - The current value, shown beside the track.
 *
 * @cssproperty --slider-fraction - The value as a fraction of the range, 0 to 1.
 * @cssproperty --slider-from - Where the filled span starts, as a fraction of the track, 0 to 1: a range's lower thumb, or a single thumb's `origin`.
 * @cssproperty --slider-marker-at - Where one marker sits, as a percentage of the track.
 * @cssproperty --slider-to - Where the filled span ends, as a fraction of the track, 0 to 1: a range's upper thumb, or the farther of a single thumb and its `origin`.
 *
 * @cssstate invalid - The slider has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-slider')
export class HelixHeadlessSlider extends MixinControllerValue(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * `Intl.NumberFormat` options the value is written with: a currency, a
   * percent, a unit, or a number of decimals. Written as JSON in the
   * attribute.
   *
   * ```html
   * <helix-slider format-options='{"style":"currency","currency":"USD"}'></helix-slider>
   * ```
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /**
   * Writes a value as text, in place of `format-options`: words for a scale,
   * or anything `Intl.NumberFormat` cannot say. A property, since a function
   * cannot be written in an attribute.
   */
  @property({ attribute: false })
  formatter?: (value: number) => string

  /**
   * The locale `format-options` writes the value in, such as `de-DE`. Empty is
   * the reader's own.
   */
  @property()
  locale = ''

  /**
   * Shows the value at each mark.
   */
  @property({ attribute: 'marker-labels', reflect: true, type: Boolean })
  markerLabels = false

  /**
   * How many marks to draw along the track, evenly spaced, ends included.
   *
   * `0` or `1` draws none: one mark on a track says nothing about a range.
   * They are decoration, so they are `aria-hidden`; what a reader can land on
   * is `step`, which the input enforces regardless.
   *
   * **Each one is snapped to a step before it is placed.** Evenly spaced and
   * on a step are two different things, and asking for four marks across a
   * hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100: two of those
   * are places the thumb cannot go. A mark the thumb can never sit on is the
   * one thing a mark must not be, so the spacing gives way rather than the
   * step, and marks may come out unevenly spaced when the two disagree. That
   * is the honest picture of the range being offered.
   */
  @property({ type: Number })
  markers = 0

  /**
   * The largest value that can be chosen.
   */
  @property({ type: Number })
  max = 100

  /**
   * The name of a range's upper thumb, read after the slider's label.
   *
   * **Named with the label rather than instead of it.** Each thumb was
   * `aria-label="${label} maximum"`, which overrode the `<label>` and read the
   * `label` string only, so a slider named by a slotted label or `aria-label`
   * had thumbs called "minimum" and "maximum" and nothing else. The word is a
   * property, like every other word a control speaks.
   */
  @property({ attribute: 'maximum-label' })
  maximumLabel = 'maximum'

  /**
   * The smallest value that can be chosen.
   */
  @property({ type: Number })
  min = 0

  /** The name of a range's lower thumb, read after the slider's label. */
  @property({ attribute: 'minimum-label' })
  minimumLabel = 'minimum'

  /**
   * How many steps a range's two thumbs stay apart, as Zag's
   * `minStepsBetweenThumbs`. A thumb pushed closer stops there.
   */
  @property({ attribute: 'min-steps-between-thumbs', type: Number })
  minStepsBetweenThumbs = 0

  /**
   * The direction the track runs. `vertical` stands it on end.
   *
   * For a level rather than a quantity: a fader, a channel, anything a reader
   * pictures as high and low rather than as less and more. Absent is
   * horizontal, which is what almost every slider in a form wants.
   *
   * **A vertical track has no length of its own**, the way a horizontal one
   * takes the width of the row it is in. `--slider-length` is that number and
   * defaults to nine rem, so one dropped into a layout is a usable height
   * rather than a thumb sitting on nothing.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Where a single thumb's fill starts: `start` at `min`, `center` at the
   * middle of the track, or `end` at `max`. Absent is `start`. A range fills
   * between its thumbs and ignores it.
   */
  @property({ reflect: true })
  origin?: 'center' | 'end' | 'start'

  /**
   * Adds a second thumb, so the value is a pair.
   *
   * The pair is one string, `"10,50"`, which is what a form submits and what
   * `MixinControllerValue` already holds. `valueAsNumber` reads the lower of
   * the two, since a range has no single number.
   */
  @property({ reflect: true, type: Boolean })
  range = false

  /**
   * How the readout joins a range's two values, with `{start}` and `{end}`
   * filled in. Write it in the page's language, such as `{start} bis {end}`.
   */
  @property({ attribute: 'range-text' })
  rangeText = '{start} to {end}'

  /**
   * Shows the chosen value beside the track.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /** How far one press of an arrow key moves the thumb. */
  @property({ type: Number })
  step = 1

  /**
   * How many characters the readout has to be able to hold, widest case.
   *
   * **A number that grows a digit makes the track jump.** The output sizes to
   * its text, so a range crossing 99 to 100 widens by a character and the row
   * gives that width back out of the track: the handle moves while the value
   * has not, which reads as the control drifting under the pointer. `3ch` was
   * the floor and covers a plain value up to three digits, and a range says
   * "35 to 100", which is ten.
   *
   * Widest rather than current, so the box never changes size at all. Measured
   * off the bounds because that is what the readout can ever say: the longer of
   * the two ends, twice, plus the words `range-text` puts between them when
   * both are shown. Negative
   * bounds are covered by measuring the rendered string rather than the digits,
   * since the sign is a character like any other.
   *
   * `tabular-nums` is on the part already and is the other half of this: equal
   * digit widths keep a same-length number from shifting inside the box the
   * same way a different-length one shifted the box.
   */
  private get reserve(): number {
    const widest = Math.max(this.said(this.min).length, this.said(this.max).length)
    return this.range
      ? widest * 2 + fillTemplate(this.rangeText, { end: '', start: '' }).length
      : widest
  }

  /**
   * How many decimals the step is written to, so a label is not float noise.
   *
   * `min + index * step` on a fractional step prints `0.30000000000000004`,
   * which is arithmetic being honest and a label being wrong. Rounding back to
   * the step's own precision is what the reader asked for when they wrote it.
   */
  private get precision(): number {
    return String(this.step).split('.')[1]?.length ?? 0
  }

  /**
   * The values the marks stand at, evenly spaced, each snapped to a step.
   */
  private get markerValues(): number[] {
    const span = this.max - this.min
    if (this.markers < 2 || span <= 0) {
      return []
    }
    const step = this.step > 0 ? this.step : 1
    const snapped = Array.from({ length: this.markers }, (_, at) => {
      const raw = this.min + (at / (this.markers - 1)) * span
      const snappedAt = Math.min(
        this.max,
        Math.max(this.min, this.min + Math.round((raw - this.min) / step) * step),
      )
      // Back to the step's own precision, or a fractional step prints
      // `0.30000000000000004` on a marker label.
      return Number(snappedAt.toFixed(this.precision))
    })
    return [...new Set(snapped)]
  }

  /**
   * The chosen value as a number, for anything doing arithmetic on it.
   *
   * @reference https://html.spec.whatwg.org/multipage/input.html#dom-input-valueasnumber HTMLInputElement.valueAsNumber
   */
  get valueAsNumber(): number {
    const parsed = Number.parseFloat(this.value)
    return Number.isNaN(parsed) ? this.min : parsed
  }

  /** Focus is delegated to the control, so the host is never the target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * The pair, as numbers, in order.
   *
   * Falls back to the whole range rather than to zero, so a range slider given
   * no value opens fully wide instead of pinned shut at its own minimum, which
   * is what a filter with nothing filtered out looks like.
   */
  private get bounds(): [number, number] {
    /* A lone number is not a range, so it is not read as one. `willUpdate`
     * seeds and sanitizes a range to a pair, and anything else that arrives
     * between the two opens fully wide, which is what "nothing filtered out"
     * looks like. */
    const parts = this.value.split(',')
    const from = Number.parseFloat(parts[0] ?? '')
    const to = Number.parseFloat(parts[1] ?? '')
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return [this.min, this.max]
    }
    return [Math.min(from, to), Math.max(from, to)]
  }

  /** Where one value sits along the track, as a fraction of it. */
  private along(at: number): number {
    const span = this.max - this.min
    if (span === 0) {
      return 0
    }
    return Math.min(1, Math.max(0, (at - this.min) / span))
  }

  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    if (this.range) {
      const [start, end] = this.bounds
      const moved = Number(control.value)
      /* Clamped against the other thumb rather than bounded by it, for the
         reason the class says: bounding shortens the input's own range and the
         two thumbs stop sharing a track. */
      const gap = this.gap
      const pair =
        control.dataset.thumb === 'start'
          ? [Math.min(moved, end - gap), end]
          : [start, Math.max(moved, start + gap)]
      this.requestValue(pair.join(','))
      restoreValue(
        control,
        String(control.dataset.thumb === 'start' ? this.bounds[0] : this.bounds[1]),
      )
      return
    }
    const next = control.value
    /* Through the mixin, like the other native-backed controls. The thumb has
       already moved either way, so wherever the answer does not follow it has
       to be put back: a refusal and a consumer who owns the value are the same
       situation seen from here. */
    this.requestValue(next)
    restoreValue(control, this.value)
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.announceChange()
  }

  /** Reports the value. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    this.refreshFeedback()
  }

  /**
   * How far along the track the thumb sits, as a fraction.
   *
   * Arithmetic rather than a measurement, because the browser already knows
   * where it drew the handle and measuring it would be a guess at that.
   *
   * **Sanitized here, never read back off the control.** Asking the input for
   * its value reads well, a range clamping and snapping whatever it is given,
   * and the timing defeats it: `fraction` is evaluated inside `render()` and the
   * `style` binding carrying it is committed *before* the `.value` binding below
   * it, so it reads the value this very render is about to replace. The fill
   * ends up a render behind the thumb, and on the first pass it reads the seeded
   * midpoint and stays there: stable and off by half a track, which reads as a
   * drawing bug rather than a timing one.
   *
   * So the same two operations a range performs are done here: snap to the step
   * from `min`, then clamp to the bounds. Nothing is read from the tree, so
   * there is no order for this to be on the wrong side of.
   */
  private get fraction(): number {
    const span = this.max - this.min
    if (span === 0) {
      return 0
    }
    return this.along(this.snapped(this.valueAsNumber))
  }

  /**
   * A single thumb's fill: `--slider-fraction`, and under `origin` the span
   * from the origin to the thumb as `--slider-from` and `--slider-to`.
   */
  private get fillStyle(): string {
    const fraction = this.fraction
    if (!this.origin) {
      return `--slider-fraction: ${fraction}`
    }
    const at = { center: 0.5, end: 1, start: 0 }[this.origin] ?? 0
    return `--slider-fraction: ${fraction}; --slider-from: ${Math.min(at, fraction)}; --slider-to: ${Math.max(at, fraction)}`
  }

  /**
   * A value snapped to the step, counted from `min` the way a range counts it.
   *
   * `min` rather than zero is the whole of it: a slider from `0.2` with a step
   * of `0.05` can land on `0.2`, `0.25` and so on, and snapping against zero
   * would offer `0.2` and `0.25` too but round the ones between to the wrong
   * side. `precision` is what keeps `0.30000000000000004` off the track, the
   * same guard the marker labels already use.
   */
  private snapped(at: number): number {
    if (!(this.step > 0)) {
      return at
    }
    const steps = Math.round((at - this.min) / this.step)
    return Number((this.min + steps * this.step).toFixed(this.precision))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A slider with no value starts in the middle, which is the platform's own
       rule and is what the control will show whether or not this agrees, and a
       range starts fully wide. Seeded here so the value the form would submit
       matches the thumbs from the first render rather than from the first
       drag: a range seeded with the midpoint drew its thumbs at the ends and
       submitted one number. */
    if (!this.hasUpdated && this.value === '') {
      /* Onto `defaultValue`, never onto `value`. `defaultValue` is where the
         markup's intent lives and where a reset returns to, and "no value given"
         is exactly a fact about the markup. Writing `value` would record the
         default as something the reader chose. */
      this.defaultValue = this.range
        ? `${this.min},${this.max}`
        : String(this.min + (this.max - this.min) / 2)
    }
    /* Sanitized as a native range sanitizes what it is given: into the bounds
       and onto the step. The thumb always showed the sanitized number, and the
       form submitted the one written, 150 on a slider that stops at 100. */
    const clean = this.sanitize(this.value)
    if (clean !== this.value) {
      this.value = clean
    }
  }

  /** One number pulled into the bounds and onto the step, as a range does. */
  private settled(at: number): number {
    const low = Math.min(this.min, this.max)
    const high = Math.max(this.min, this.max)
    return Math.min(high, Math.max(low, this.snapped(Math.min(high, Math.max(low, at)))))
  }

  /**
   * The value as a native range would hold it: a number in the bounds on the
   * step, or for a range, two of them in order.
   */
  private sanitize(text: string): string {
    if (this.range) {
      const [from, to] = text.split(',').map((part) => Number.parseFloat(part))
      if (
        from === undefined ||
        to === undefined ||
        !Number.isFinite(from) ||
        !Number.isFinite(to)
      ) {
        return `${this.min},${this.max}`
      }
      const ends = [this.settled(from), this.settled(to)].sort((a, b) => a - b)
      return ends.join(',')
    }
    const parsed = Number.parseFloat(text)
    const at = Number.isFinite(parsed) ? parsed : this.min + (this.max - this.min) / 2
    return String(this.settled(at))
  }

  /** How far apart a range's thumbs stay, in the slider's own units. */
  private get gap(): number {
    return Math.max(0, this.minStepsBetweenThumbs) * this.step
  }

  /** Whether the value is written by `formatter` or `format-options`. */
  private get formats(): boolean {
    return this.formatter !== undefined || this.formatOptions !== undefined
  }

  /** A value as the reader sees it: formatted where asked, the number otherwise. */
  private said(at: number | string): string {
    const number = typeof at === 'number' ? at : Number.parseFloat(at)
    if (!Number.isFinite(number)) {
      return String(at)
    }
    if (this.formatter) {
      return this.formatter(number)
    }
    return this.formatOptions ? formatNumber(number, this.locale, this.formatOptions) : String(at)
  }

  /** What a screen reader says for one thumb, where `value-text` asks. */
  private spoken(at: number | string): string | typeof nothing {
    if (this.valueText) {
      return fillTemplate(this.valueText, { value: this.said(at) })
    }
    return this.formats ? this.said(at) : nothing
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  /**
   * What a screen reader says for a thumb's value, with `{value}` filled in,
   * such as `{value} degrees`. Empty announces the number alone.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  protected override render(): TemplateResult {
    /* The range's bounds are written before its value below, and that order is
       the whole of this element's correctness on a wide scale. Lit commits
       bindings in template order, and a range clamps whatever is assigned to the
       bounds it holds at that moment: with the value first, a slider from 0 to
       360 given 225 took the default max of 100, clamped to 100, and drew its
       handle at 100/360.

       The symptom is the fill and the handle disagreeing, because they are
       computed from different things: the fill is arithmetic on this element's
       property, and the handle is the platform's reading of the input's own
       clamped value. It appears on any slider with a max above 100, and the
       fill being right is what makes it read as a drawing bug rather than a
       value one. */
    const [start, end] = this.bounds

    /* One input per thumb, each spanning the whole range so both read against
       the same track. The lower one paints the fill and the upper one's track
       is transparent, because two stacked tracks would paint the ramp twice.
       Each tells a screen reader it stops at the other, as the multi-thumb
       slider pattern asks, through `aria-valuemin` and `aria-valuemax`: the
       inputs' own bounds stay the whole track. */
    /* **The lower thumb answers to `control`, and it has to answer to
       something.** `MixinField.renderLabel` writes `<label for="control">` for
       every field in the library, so a range branch that does not render that id
       ships a label pointing at nothing: pressing the words focuses no thumb and
       the `<output for>` beside it names a missing element too. Valid markup
       that reaches nothing and says nothing.

       The lower one, because a label forwards a press to the first control it
       names and the reader expects the start of the range. The upper takes
       `control-end`, which is what the readout lists alongside it. */
    const thumb = (which: 'end' | 'start', at: number): TemplateResult => html`<input
        part="control"
        id=${which === 'start' ? 'control' : 'control-end'}
        data-thumb=${which}
        type="range"
        style="--slider-from: ${this.along(start)}; --slider-to: ${this.along(end)}"
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${String(at)}
        aria-labelledby=${this.labeled ? `${this.labelId} ${which}-name` : `${which}-name`}
        aria-valuemin=${which === 'end' ? start + this.gap : nothing}
        aria-valuemax=${which === 'start' ? end - this.gap : nothing}
        aria-valuetext=${this.spoken(at)}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        ?disabled=${this.isDisabled}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />`

    /* `data-markers` mirrors "there are marks" for the stylesheet.
     *
     * `markers` does not reflect, so a marker layout hung off `:host([markers])`
     * draws nothing for `slider.markers = 5`: only the attribute written in the
     * markup works, and the property that is the documented API silently does
     * not.
     *
     * Reflecting the count instead would put `markers="0"` on every slider, an
     * attribute the server's markup does not have and one that selector would
     * match, drawing the layout for no marks. So the boolean fact is mirrored
     * to a `data-` name, which is the rule this library already follows for
     * state: the stylesheet wants to know whether there are marks, not how
     * many. How many is what `markerValues` answers, and `< 2` is where it
     * already draws the line.
     *
     * A `/*` and written here, because it describes this binding and not a
     * member. Nothing catches an unclosed block, only one sitting on another,
     * so a `/**` that swallows the member below it ships as that member's
     * description. */
    return html`${this.renderLabel()}
    ${
      /* What each thumb adds to the label, read through `aria-labelledby` and
         never drawn: a reference reads a hidden element's text all the same. */
      this.range
        ? html`<span id="start-name" hidden>${this.minimumLabel}</span
            ><span id="end-name" hidden>${this.maximumLabel}</span>`
        : nothing
    }
    <div
      part="field"
      data-markers=${this.markerValues.length > 0 ? '' : nothing}
      data-range=${this.range ? '' : nothing}
      style="--slider-fraction: ${this.fraction}; --slider-from: ${this.along(start)}; --slider-to: ${this.along(end)}"
    >
      ${this.range ? thumb('start', start) : nothing}
      ${this.range ? thumb('end', end) : nothing}
      ${
        this.range
          ? nothing
          : html`<input
              part="control"
              id=${this.controlId}
              type="range"
              style=${this.fillStyle}
              data-origin=${this.origin ?? nothing}
              min=${this.min}
              max=${this.max}
              step=${this.step}
              .value=${this.value}
              name=${this.name || nothing}
              aria-valuetext=${this.spoken(this.value)}
              aria-describedby=${this.describedBy ?? nothing}
              aria-invalid=${this.invalidity ?? nothing}
              ?disabled=${this.isDisabled}
              @input=${this.handleInput}
              @change=${this.handleChange}
            />`
      }
      ${
        this.markers > 1
          ? html`<div part="markers" aria-hidden="true">
              ${this.markerValues.map(
                (at) =>
                  html`<span
                    part="marker"
                    style="--slider-marker-at: ${((at - this.min) / (this.max - this.min)) * 100}%"
                    >${
                      this.markerLabels
                        ? html`<span part="marker-label">${this.said(at)}</span>`
                        : nothing
                    }</span
                  >`,
              )}
            </div>`
          : nothing
      }
      ${
        /* Hidden from the accessibility tree, like the markers above it.
         *
         * A bare `<output>` maps to `role="status"` with an implicit polite
         * live region, so every intermediate value during a drag was announced
         * on top of the range's own value announcement: a reader dragging from
         * 10 to 60 heard both twice, fifty times. It repeats what the control
         * already reports, which is the definition of decoration. */
        this.showValue
          ? html`<output
              part="output"
              for=${this.range ? 'control control-end' : 'control'}
              aria-hidden="true"
              style=${`--_slider-output-reserve: ${this.reserve}ch`}
              >${
                this.range
                  ? fillTemplate(this.rangeText, { end: this.said(end), start: this.said(start) })
                  : this.said(this.value)
              }</output
            >`
          : nothing
      }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-slider': HelixHeadlessSlider
  }
}
