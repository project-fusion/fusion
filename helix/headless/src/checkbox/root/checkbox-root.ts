import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  MixinControllerChecked,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A box that is ticked, or not, or neither.
 *
 * @description
 * Renders a real `<input type="checkbox">`, so the space key, the focus ring,
 * and the indeterminate glyph come from the platform. `delegatesFocus` puts
 * focus on it, and it serializes into the server's markup, so the control is
 * reachable before any script loads.
 *
 * **The input inside a shadow root submits nothing**, because the form is on
 * the other side of the boundary. The host is form-associated instead and
 * reports its own value through `ElementInternals`, which is also what carries
 * validity and what answers a form reset.
 *
 * A checked box submits its `value`, and an unchecked one submits nothing at
 * all. That is what a native checkbox does, and a form built around one reads
 * the absence rather than a `false`.
 *
 * `indeterminate` is presentation and nothing else. It is neither checked nor
 * unchecked to a reader, it never submits, and the first click resolves it: a
 * third state that survives interaction is a control nobody can finish.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Tickbox
 * @documentation https://fusion.dev/helix/components/checkbox
 *
 * @slot - The label.
 *
 * @event {Event} change - Relayed from the input once the state has changed.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - Fired before the state changes, and cancelable.
 * @event {Event} input - Announced once the state has moved.
 *
 * @csspart box - The frame the input is painted as, and the mark sits over.
 * @csspart control - The input.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The row the box and its label share, and the surface the card appearance draws.
 * @csspart hint - Help under the control, while nothing is wrong.
 * @csspart label - The label beside it.
 * @csspart mark - The tick, or the dash when the box is indeterminate.
 * @csspart mark-checked - The mark while the box is checked, beside `mark`.
 * @csspart mark-indeterminate - The mark while the box is indeterminate, beside `mark`.
 *
 * @cssstate checked - While the box is checked.
 * @cssstate has-label - While the label slot holds something to read, which is what draws a label at all.
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 */
@customElement('helix-headless-checkbox')
export class HelixHeadlessCheckbox extends MixinControllerChecked(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /**
   * Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   */
  @property({ reflect: true, type: Boolean })
  indeterminate = false

  /**
   * Value submitted when the box is checked.
   */
  @property()
  value = 'on'

  /** Focus is delegated to the input, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleChange = (event: Event): void => {
    const input = event.target as HTMLInputElement
    // The input has already flipped itself. Where the change is refused it is
    // put back to whatever the element resolves to, so the box never shows a
    // state the element does not hold.
    const next = input.checked
    /* The dash goes only where the change is taken. Clearing it
     * unconditionally leaves a refused change holding the checked state and
     * losing the third one: a box neither ticked nor dashed, which is a state
     * nobody asked for. Refusing leaves everything as it was, which is the
     * argument the line below already makes for `checked`. */
    if (this.requestChecked(next)) {
      this.indeterminate = false
    }
    input.checked = this.checked
    this.relayNativeEvent(event)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.checked ? this.value : null)
    this.reportRequired(!this.checked, 'Tick this box to continue.', 'control')
  }

  /** Returns the box to the state its markup declared. */
  formResetCallback(): void {
    this.indeterminate = false
    // `resetChecked` drops both halves, the consumer's and the element's, so
    // there is nothing to clear before it.
    this.resetChecked()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaRequired = this.required ? 'true' : null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.syncLabelPresence()
  }

  /**
   * Whether there is a label to leave room for, written to the host.
   *
   * The row is a flex line with a gap in it, so a label span rendered empty is
   * still a box and still takes that gap: an unlabelled box came out with eight
   * pixels of nothing after it. The input answers this by not rendering the
   * element, which cannot work here, because a checkbox is named by its own
   * content and the property is only that slot's fallback. Gating on the
   * property would unlabel every `<helix-checkbox>Text</helix-checkbox>` ever
   * written.
   *
   * So the slot is asked instead, the same way `Tooltip` asks its own: with
   * `flatten`, because here the fallback counts, being where the property
   * renders. Client only, so a server-rendered unlabelled checkbox carries the
   * gap for one frame. That is a control with no accessible name, which has a
   * worse problem than its spacing.
   */
  private readonly handleLabelChange = (): void => {
    this.syncLabelPresence()
  }

  /**
   * Asks the slot, and records the answer as a state.
   *
   * Called on `slotchange` and after every update, and the second is not
   * belt-and-braces: **`slotchange` does not fire when nothing is assigned.**
   * Without it a checkbox labeled only by its property, which is most of them,
   * never hears about its own label and renders without one.
   *
   * **`:state(has-label)` and not `data-has-label`.** The answer comes from
   * `assignedNodes` and a server has no tree to ask, so an attribute would
   * appear on every labeled checkbox the instant it upgraded and on none that
   * any server sent. See `HelixElement.toggleState`.
   */
  private syncLabelPresence(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('[part="label"] slot')
    const filled = (slot?.assignedNodes({ flatten: true }) ?? []).some(
      (node) => node.textContent?.trim() !== '' || node.nodeType === Node.ELEMENT_NODE,
    )
    this.toggleState('has-label', filled)
    /* And `hidden` on the region itself, because the state is on the host and
       this tier has no sheet to turn one into the other, so a checkbox with no
       label would keep an empty label box beside it. The styled rule stays,
       since it hides through a descendant selector this cannot replace. */
    this.partNamed('label')?.toggleAttribute('hidden', !filled)
  }

  protected override render(): TemplateResult {
    /* A real `<label>` around both, which is the whole of what makes the text a
       target. A `<span>` beside the input leaves pressing the words doing
       nothing.

       Labeling is behavior, which is what earns an element here rather than a
       bare slot: the wrapper is not decoration and there is no other way to get
       it. The browser handles the forwarding, so there is no click handler to
       write and none to get wrong.

       The one line of description goes under that row, which is where a field
       puts it too.

       `mark-checked` and `mark-indeterminate` repeat the host's state on the
       mark, for the box a component draws in its own shadow root: Data Table's
       are out of reach of any selector naming the host.

       **`.checked` falls back to `nothing`, where `?disabled` and `?required`
       two lines down are plain booleans.** The difference is the platform:
       `disabled` and `required` are their own state, so the attribute is the
       whole answer, and `checked` is not. A checkbox's `checked` attribute is
       its *default*, and the first click sets the dirty flag that severs it
       from the control, so only the property moves a box a reader has touched.
       A property binding alone is what a server stringifies, and a boolean
       attribute is true whenever it is present: `checked="false"` is a ticked
       box to anything reading the markup before hydration. `nothing` is the one
       value that serves no attribute and sets the property to `undefined`, so
       the client keeps the property it needs and the server states nothing it
       cannot support. */
    return html`<label part="field">
      <span part="box">
        <input
          part="control"
          type="checkbox"
          .checked=${this.checked || nothing}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy ?? nothing}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
        <span
          part="mark${this.checked ? ' mark-checked' : ''}${this.indeterminate ? ' mark-indeterminate' : ''}"
          aria-hidden="true"
        ></span>
      </span>
      <span part="label"><slot @slotchange=${this.handleLabelChange}>${this.label}</slot></span>
    </label>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-checkbox': HelixHeadlessCheckbox
  }
}
