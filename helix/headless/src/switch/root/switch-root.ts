import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  HostClickController,
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
 * A switch turns something on or off right away, and a checkbox is an answer
 * the form submits later. A screen reader announces `role="switch"` as "on" or
 * "off", and people expect the change to take effect immediately. A switch is
 * as common outside a form as inside one.
 *
 * It renders a real `<input type="checkbox">` with `role="switch"`, the pairing
 * ARIA describes. The input is what a form submits and what a label forwards a
 * press to, and the role is what a screen reader announces.
 *
 * The label sits beside the switch, inside the `<label>` that forwards the
 * press, the same as a checkbox. The hint and the message go below the row,
 * because the switch and its label share one line.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Toggle switch, On/off
 * @documentation https://fusion.dev/helix/components/switch
 *
 * @slot - The label that names what the switch turns on.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 *
 * @event {Event} change - Sent from the input after the state changes.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - Fired before the state changes, and cancelable.
 * @event {Event} input - Sent after the state changes.
 *
 * @csspart control - The input.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The row: the track and its label.
 * @csspart hint - Help under the control, while nothing is wrong.
 * @csspart label - The label beside the track.
 * @csspart track - The track. Draw the thumb on the track itself, with
 * `::part(track)::after` in your stylesheet. This tier ships no CSS, so it
 * renders no separate thumb element, which would be an empty child that costs
 * your layout as much as any other child. `ListItem` measured that cost.
 *
 * @cssstate checked - While it is on.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-switch')
export class HelixHeadlessSwitch extends MixinControllerChecked(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('control'),
  })

  /** A click on the element itself, `click()` or a page's `<label for>`, toggles it. */
  protected readonly clicks = new HostClickController(this, () => this.partNamed('control'))

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
  override formResetCallback(): void {
    super.formResetCallback()
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
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'label', [''])
  }

  protected override render(): TemplateResult {
    /* A real `<label>` around both, so pressing the words works with no click
       handler: the browser does the forwarding.

       **`.checked` falls back to `nothing`, where `?disabled` and `?required`
       below are plain booleans**, for the reason `Checkbox` writes out at the
       same line: `checked` is the control's default rather than its state, so
       the property is what moves a switch a reader has touched, and a property
       binding is what a server stringifies into `checked="false"`, which a
       boolean attribute reads as on. `nothing` serves no attribute and sets the
       property to `undefined`. */
    return html`<label part="field">
      <span part="track">
        <input
          part="control"
          type="checkbox"
          role="switch"
          .checked=${this.checked || nothing}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
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
