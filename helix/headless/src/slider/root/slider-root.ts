import {
  customElement,
  HelixChangeEvent,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
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
 * Ticks are the platform's too, through `<datalist>`. A list of marks drawn
 * here would be marks the input does not snap to.
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

  /** Name submitted with the form. */
  @property()
  name = ''

  /** Whether the chosen value is shown beside the track. */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /** How far one press of an arrow key moves it. */
  @property({ type: Number })
  step = 1

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
    const allowed = this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: next }))
    if (!allowed) {
      control.value = this.value
      return
    }
    this.value = next
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /** Reports the value, and how far along the track it sits. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    /* Written as a custom property rather than measured, because the browser
       already knows: the fraction is arithmetic the component can do exactly
       and a measurement of the thumb would be a guess at where the platform
       drew it. The styled tier fills the track with it. */
    const span = this.max - this.min
    const fraction = span === 0 ? 0 : (this.valueAsNumber - this.min) / span
    this.style.setProperty('--_slider-fraction', String(fraction))
    this.refreshFeedback()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A range with no value starts in the middle, which is the platform's own
       rule and is what the control will show whether or not this agrees. Seeded
       here so the value the form would submit matches the thumb from the first
       render rather than from the first drag. */
    if (!this.hasUpdated && this.value === '') {
      this.value = String(this.min + (this.max - this.min) / 2)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
    <div part="field">
      <input
        part="control"
        id="control"
        type="range"
        .value=${this.value}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        name=${this.name || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.disabled}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      ${this.showValue ? html`<output part="output" for="control">${this.value}</output>` : nothing}
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-slider': HelixBaseSlider
  }
}
