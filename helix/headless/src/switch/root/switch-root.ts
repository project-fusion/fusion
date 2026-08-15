import { customElement, HelixFormElement, MixinControllerChecked, MixinField } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A control that turns something on, and turns it on when pressed.
 *
 * @description
 * **A switch is not a checkbox with a different shape.** A checkbox is an
 * answer to a question the form asks when it is submitted; a switch is a thing
 * happening now. That is why `role="switch"` exists and why a switch belongs
 * outside a form as often as in one: it says "on" and "off" rather than
 * "ticked" and "unticked", and a reader expects the effect immediately rather
 * than on Save.
 *
 * Rendered as a real `<input type="checkbox">` carrying `role="switch"`, which
 * is the pairing ARIA describes: the input is what a form submits and what a
 * label forwards a press to, and the role is what a screen reader announces.
 * Neither half can be got from the other.
 *
 * The label sits beside it, inside the `<label>` that forwards the press, the
 * way a checkbox's does. The hint and the message go under the row, because
 * there is no above: the switch and the words naming it are one line.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Toggle switch, On/off
 * @documentation https://helix.fusion.dev/components/switch
 *
 * @slot - The words naming what this turns on.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the state changes, and cancelable.
 * @event {Event} change - Relayed from the input once the state has changed.
 *
 * @csspart field - The row: the track and its label.
 * @csspart track - The groove the thumb travels in.
 * @csspart control - The input.
 * @csspart thumb - The part that moves.
 * @csspart label - The words beside it.
 */
@customElement('helix-base-switch')
export class HelixBaseSwitch extends MixinControllerChecked(MixinField(HelixFormElement)) {
  /** Name submitted with the form. */
  @property()
  name = ''

  /** Value submitted when the switch is on. */
  @property()
  value = 'on'

  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    if (!this.requestChecked(control.checked)) {
      control.checked = this.isChecked
      return
    }
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /** Reports what the form would submit, and the verdict on it. */
  private sync(): void {
    // `null` rather than the value when it is off, which is how a checkbox
    // behaves: an unticked box submits nothing rather than a blank.
    this.internals.setFormValue(this.isChecked ? this.value : null)
    if (this.required && !this.isChecked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Turn this on to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="control"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
    this.refreshFeedback()
  }

  /** Returns the switch to the state its markup declared. */
  formResetCallback(): void {
    this.checked = undefined
    this.resetChecked()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    /* A real `<label>` around both, so pressing the words works with no click
       handler: the browser does the forwarding. */
    return html`<label part="field">
      <span part="track">
        <input
          part="control"
          type="checkbox"
          role="switch"
          .checked=${this.isChecked}
          ?disabled=${this.disabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy ?? nothing}
          @change=${this.handleChange}
        />
        <span part="thumb" aria-hidden="true"></span>
      </span>
      <span part="label"><slot>${this.label}</slot></span>
    </label>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-switch': HelixBaseSwitch
  }
}
