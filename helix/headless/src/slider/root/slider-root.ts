import {
  AriaForwardController,
  customElement,
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
 * A real `<input type="range">`, so the drag, the arrow keys, Home and End, the
 * page keys and the touch target are the platform's. The last is the one nobody
 * notices: a native range has a hit area larger than its thumb, sized by the
 * platform for a finger.
 *
 * **The value is a string, like every other form control's.** A range submits
 * text and `MixinControllerValue` holds text, so the number is a reading of the
 * value. `valueAsNumber` is there for arithmetic.
 *
 * **Marks are drawn rather than left to `<datalist>`**, whose ticks cannot be
 * styled and which Firefox does not render for a range at all. A mark is
 * decoration; what a reader can land on is `step`, which the input enforces
 * whether or not anything is drawn. `markers` is a count rather than a flag, so
 * a slider from zero to a hundred cannot silently ask for a hundred and one.
 *
 * **A range is two of them.** There is no native two-thumb range, so two are
 * stacked on one track and each thumb keeps its own.
 *
 * **`required` arrives with the field mixin and cannot fail here**, which is
 * worth saying rather than leaving a reader to find. A range is never empty:
 * the platform shows its own midpoint whatever is set, and `willUpdate` seeds
 * that midpoint into `defaultValue` so the value agrees with the handle from the
 * first render. HTML does not apply `required` to a range either, so it stays
 * off the control and the marker beside the label is all it does.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Range, Range input
 * @documentation https://fusion.dev/helix/components/slider
 *
 * @event {Event} change - Relayed once the reader has let go.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the value changes, and cancelable.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart control - The range input.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The row: the control and its readout.
 * @csspart hint - Help under the track, while nothing is wrong.
 * @csspart label - The question, over the track.
 * @csspart marker - One mark.
 * @csspart marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart markers - The row of marks along the track.
 * @csspart output - The current value, shown beside it.
 *
 * @cssproperty --slider-fraction - The value as a fraction of the range, 0 to 1.
 * @cssproperty --slider-from - Where a range's filled span starts, as a fraction of the track, 0 to 1.
 * @cssproperty --slider-marker-at - Where one marker sits, as a percentage of the track.
 * @cssproperty --slider-to - Where a range's filled span ends, as a fraction of the track, 0 to 1.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
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
   * Whether each mark says which value it stands at.
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
   * The largest value the reader can choose.
   */
  @property({ type: Number })
  max = 100

  /**
   * The smallest value the reader can choose.
   */
  @property({ type: Number })
  min = 0

  /**
   * Which way the track runs, `vertical` standing it on end.
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
   * Whether there are two thumbs and the value is a pair.
   *
   * The pair is one string, `"10,50"`, which is what a form submits and what
   * `MixinControllerValue` already holds. `valueAsNumber` reads the lower of
   * the two, since a range has no single number.
   */
  @property({ reflect: true, type: Boolean })
  range = false

  /**
   * Whether the chosen value is shown beside the track.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

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
   * the two ends, twice, plus the four of " to " when both are shown. Negative
   * bounds are covered by measuring the rendered string rather than the digits,
   * since the sign is a character like any other.
   *
   * `tabular-nums` is on the part already and is the other half of this: equal
   * digit widths keep a same-length number from shifting inside the box the
   * same way a different-length one shifted the box.
   */
  private get reserve(): number {
    const widest = Math.max(String(this.min).length, String(this.max).length)
    return this.range ? widest * 2 + ' to '.length : widest
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
    /* A lone number is not a range, so it is not read as one.
     *
     * An untouched range slider does not hold an empty string: the native input
     * reports its own midpoint and the mixin takes it, so `value` came back as
     * "50" on a slider from 10 to 90 and reading that as the lower thumb put a
     * filter half shut before anyone touched it. Only a pair is a pair, and
     * anything else opens fully wide, which is what "nothing filtered out"
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
      const pair =
        control.dataset.thumb === 'start'
          ? [Math.min(moved, end), end]
          : [start, Math.max(moved, start)]
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
    /* A range with no value starts in the middle, which is the platform's own
       rule and is what the control will show whether or not this agrees. Seeded
       here so the value the form would submit matches the thumb from the first
       render rather than from the first drag. */
    if (!this.hasUpdated && this.value === '') {
      /* Onto `defaultValue`, never onto `value`. `defaultValue` is where the
         markup's intent lives and where a reset returns to, and "no value given"
         is exactly a fact about the markup. Writing `value` would record the
         midpoint as something the reader chose, so a form reset would return to
         it rather than clearing it. */
      this.defaultValue = String(this.min + (this.max - this.min) / 2)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  /** How far one press of an arrow key moves it. */
  @property({ type: Number })
  step = 1

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
       is transparent, because two stacked tracks would paint the ramp twice. */
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
        aria-label=${`${this.label} ${which === 'start' ? 'minimum' : 'maximum'}`}
        aria-describedby=${this.describedBy ?? nothing}
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
              id="control"
              type="range"
              style="--slider-fraction: ${this.fraction}"
              min=${this.min}
              max=${this.max}
              step=${this.step}
              .value=${this.value}
              name=${this.name || nothing}
              aria-describedby=${this.describedBy ?? nothing}
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
                      this.markerLabels ? html`<span part="marker-label">${at}</span>` : nothing
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
              >${this.range ? `${start} to ${end}` : this.value}</output
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
