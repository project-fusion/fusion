import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  MixinControllerChecked,
  MixinField,
  markRegion,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A control that turns something on or off.
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
 * @status stable
 * @category forms
 * @aliases Toggle switch, On/off
 * @documentation https://fusion.dev/helix/components/switch
 *
 * @slot - The words naming what this turns on.
 *
 * @event {Event} change - Relayed from the input once the state has changed.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - Fired before the state changes, and cancelable.
 * @event {Event} input - Announced once the state has moved.
 *
 * @csspart control - The input.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The row: the track and its label.
 * @csspart hint - Help under the control, while nothing is wrong.
 * @csspart label - The words beside it.
 * @csspart thumb - The part that moves.
 * @csspart track - The groove the thumb travels in.
 *
 * @cssstate checked - While it is on.
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 */
@customElement('helix-headless-switch')
export class HelixHeadlessSwitch extends MixinControllerChecked(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /**
   * Value submitted when the switch is on.
   */
  @property()
  value = 'on'

  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    const taken = this.requestChecked(control.checked)
    /* The input follows the element, always, not only where the change was
       refused.
     *
     * A controlled switch takes the request and applies nothing: it has
       announced where it would go and is waiting to be told. The input had
       already flipped itself, so until the consumer answered, the switch showed
       one state and held the other, and a consumer who never answers showed the
       wrong one for good. Putting it back costs nothing where the change was
       taken, since `this.checked` is then the new value anyway. */
    control.checked = this.checked
    if (!taken) {
      return
    }
    this.announceChange()
  }

  /** Reports what the form would submit, and the verdict on it. */
  private sync(): void {
    // `null` rather than the value when it is off, which is how a checkbox
    // behaves: an unticked box submits nothing rather than a blank.
    this.internals.setFormValue(this.checked ? this.value : null)
    this.reportRequired(!this.checked, 'Turn this on to continue.', 'control')
  }

  /** Returns the switch to the state its markup declared. */
  formResetCallback(): void {
    // `resetChecked` drops both halves, the consumer's and the element's, so
    // there is nothing to clear before it.
    this.resetChecked()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    this.sync()
  }

  /**
   * Says on the `label` region whether anything is in it.
   *
   * An empty region is not free: it is still a flex item, so it still takes the
   * container's gap. There is no selector that can ask, `slot:empty` being
   * about a slot's fallback rather than its assigned nodes, so the component
   * asks and says so, on the region inside this shadow root rather than on the
   * host: an attribute written onto the host is a change to markup the consumer
   * rendered, which React reports on hydration and does not patch up.
   */
  private markEmpty(): void {
    /* `hidden` beside the mirror, because `data-empty` is a hook the styled
       sheet reads and this tier has no sheet: an empty region left in the box
       tree is a gap a consumer cannot close without knowing to look for it. The
       styled rule stays, because that sheet sets `display` on this part and so
       outranks the UA one. */
    markRegion(this.renderRoot, 'label', [''])
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
          .checked=${this.checked}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy ?? nothing}
          @change=${this.handleChange}
          @input=${this.stopInner}
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
    'helix-headless-switch': HelixHeadlessSwitch
  }
}
