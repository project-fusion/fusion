import {
  customElement,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A value chosen from a range by dragging.
 *
 * @description
 * A real `<input type="range">`, so the drag, the arrow keys, Home and End, the
 * page keys and the touch target are all the platform's. Every one of those is
 * a thing a hand-built slider gets wrong, and the last is the one nobody
 * notices: a native range has a hit area larger than its thumb, sized by the
 * platform for a finger.
 *
 * **The value is a string, like every other form control's.** A range submits
 * text and `MixinControllerValue` holds text, so the number is a reading of the
 * value rather than the value itself. `valueAsNumber` is there for anything
 * doing arithmetic on it.
 *
 * **Marks are drawn rather than left to `<datalist>`**, which was the first
 * answer and is the wrong one. A datalist's ticks cannot be styled at all, and
 * Firefox does not render them for a range at all, so the platform's version is
 * a mark that looks like someone else's design where it appears and no mark
 * where it does not. Drawing them costs the semantics nothing, because a mark
 * is decoration: what a reader can actually land on is `step`, which the input
 * enforces whether or not anything is drawn.
 *
 * `markers` is a count rather than a flag tied to `step`. A flag reads well
 * until a slider from zero to a hundred stepping by one asks for a hundred and
 * one ticks, and then it is either noise or a silent refusal to draw. A number
 * is what the reader sees, so it cannot surprise anyone.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Range, Range input
 * @documentation https://helix.fusion.dev/components/slider
 *
 * @event {HelixChangeEvent} helix-change - Fired as the value changes, and cancelable.
 * @event {Event} change - Relayed once the reader has let go.
 *
 * @csspart field - The row: the control and its readout.
 * @csspart control - The range input.
 * @csspart markers - The row of marks along the track.
 * @csspart marker - One mark.
 * @csspart marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart output - The current value, shown beside it.
 */
@customElement('helix-base-slider')
export class HelixBaseSlider extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** The largest value the reader can choose. */
  @property({ type: Number })
  max = 100

  /** The smallest value the reader can choose. */
  @property({ type: Number })
  min = 0

  /** Whether the chosen value is shown beside the track. */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

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
   * Mirrors "there are marks" for the stylesheet.
   *
   * The whole marker layout hung off `:host([markers])` and `markers` does not
   * reflect, so `slider.markers = 5` drew nothing at all: only the attribute
   * written in the markup ever worked, and the property that is the documented
   * API silently did not.
   *
   * Reflecting the count instead would put `markers="0"` on every slider, an
   * attribute the server's markup does not have and one that selector would
   * match, drawing the layout for no marks. So the boolean fact is mirrored to
   * a `data-` name, which is the rule this library already follows for state:
   * the stylesheet wants to know whether there are marks, not how many. How
   * many is what `markerValues` answers, and `< 2` is where it already draws
   * the line.

  /** Whether each mark says which value it stands at. */
  @property({ attribute: 'marker-labels', reflect: true, type: Boolean })
  markerLabels = false

  /** How far one press of an arrow key moves it. */
  @property({ type: Number })
  step = 1

  /**
   * The value each mark stands at, snapped to a step it can be reached on.
   *
   * De-duplicated, because snapping can land two marks on one step: five marks
   * across a range of two steps is three marks, not five with a pair on top of
   * each other, and two marks in one place read as one drawn badly.
   */
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

  /** The chosen value as a number, for anything doing arithmetic on it. */
  get valueAsNumber(): number {
    const parsed = Number.parseFloat(this.value)
    return Number.isNaN(parsed) ? this.min : parsed
  }

  /** Focus is delegated to the control, so the host is never the target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleInput = (event: Event): void => {
    const control = event.target as HTMLInputElement
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
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /** Reports the value. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    this.refreshFeedback()
  }

  /**
   * How far along the track the thumb sits, as a fraction.
   *
   * Arithmetic rather than a measurement, because the browser already knows and
   * measuring the thumb would be a guess at where the platform drew it. The
   * styled tier fills the track with it.
   *
   * Read from the control where there is one, not from `value`. A range
   * sanitizes what it is given, clamping to the bounds and snapping to the
   * step, so a slider given an off-step or out-of-range value had a thumb in
   * one place and a fill, a readout and a submitted value in another. What the
   * control settled on is the truth about where the thumb is.
   */
  private get fraction(): number {
    const span = this.max - this.min
    if (span === 0) {
      return 0
    }
    const control = this.renderRoot?.querySelector<HTMLInputElement>('[part="control"]')
    const at = control ? Number(control.value) : this.valueAsNumber
    return Math.min(1, Math.max(0, (at - this.min) / span))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A range with no value starts in the middle, which is the platform's own
       rule and is what the control will show whether or not this agrees. Seeded
       here so the value the form would submit matches the thumb from the first
       render rather than from the first drag. */
    if (!this.hasUpdated && this.value === '') {
      /* Onto `defaultValue`, never onto `value`. Writing `value` is how a
         consumer says they own it, so seeding through it would have made every
         range with no value controlled on its first render and frozen the thumb
         where it started. `defaultValue` is where the markup's intent lives,
         and "no value given" is exactly a fact about the markup. */
      this.defaultValue = String(this.min + (this.max - this.min) / 2)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    /* The range's bounds are written before its value below, and that order is
       the whole of this element's correctness on a wide scale. Lit commits
       bindings in template order, and a range clamps whatever is assigned to the
       bounds it holds at that moment: with the value first, a slider from 0 to
       360 given 225 took the default max of 100, clamped to 100, and drew its
       handle at 100/360.
   *
   * Found on Input Color's hue channel, where the handle sat at 28 per cent of a
   * track whose fill said 62.5. The two disagreed because they are computed from
   * different things: the fill is arithmetic on this element's property, and the
   * handle is the platform's reading of the input's own clamped value. Every
   * slider with a max above 100 had it, and the fill being right is what made it
   * read as a drawing bug rather than a value one. */
    return html`${this.renderLabel()}
    <div part="field" data-markers=${this.markerValues.length > 0 ? '' : nothing}>
      <input
        part="control"
        id="control"
        type="range"
        style="--_slider-fraction: ${this.fraction}"
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${this.value}
        name=${this.name || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.isDisabled}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      ${
        this.markers > 1
          ? html`<div part="markers" aria-hidden="true">
              ${this.markerValues.map(
                (at) =>
                  html`<span
                    part="marker"
                    style="--_marker-at: ${((at - this.min) / (this.max - this.min)) * 100}%"
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
          ? html`<output part="output" for="control" aria-hidden="true">${this.value}</output>`
          : nothing
      }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-slider': HelixBaseSlider
  }
}
