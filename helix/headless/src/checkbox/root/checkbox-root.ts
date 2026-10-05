import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  HostClickController,
  MixinControllerChecked,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A box that is checked, unchecked, or indeterminate.
 *
 * @description
 * Renders a native `<input type="checkbox">`, so the Space key, the focus ring,
 * and the indeterminate glyph come from the platform. `delegatesFocus` sends
 * focus to the input, and the input is in the server-rendered markup, so the
 * control works before any script loads.
 *
 * An input inside a shadow root does not submit with a form. The host is
 * form-associated and uses `ElementInternals` for its value, its validity, and
 * form reset.
 *
 * A checked box submits its `value`, and an unchecked one submits nothing, as a
 * native checkbox does.
 *
 * `indeterminate` changes only the presentation. Assistive technology reports
 * it as neither checked nor unchecked, it never submits, and the first click
 * resolves it.
 *
 * **Keyboard.** The box is one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | Space | Checks or unchecks the box, and resolves `indeterminate`. |
 *
 * The native input reports checked, unchecked, or mixed. `aria-readonly` is set
 * under `readonly`, and `aria-invalid` and `aria-describedby` point at the
 * message while one shows.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Tickbox
 * @documentation https://fusion.dev/helix/components/checkbox
 *
 * @slot - The label.
 * @slot check - An icon drawn as the mark while the box is checked, in place of the tick.
 * @slot dash - An icon drawn as the mark while the box is indeterminate, in place of the dash.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 *
 * @event {Event} change - The box was checked or unchecked. Relayed from the native input.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - The box is about to be checked or unchecked. Cancelable: cancel it to keep its state.
 * @event {Event} input - The box was checked or unchecked.
 *
 * @csspart box - The box drawn for the input, under the mark.
 * @csspart control - The native input.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The row that holds the box and its label. It is the card when `separation` is set.
 * @csspart hint - Help text under the control, shown while there is no feedback.
 * @csspart label - The label next to the box.
 * @csspart mark - The check mark, or the dash when the box is indeterminate.
 * @csspart mark-checked - Added to `mark` while the box is checked.
 * @csspart mark-dash - Added to `mark` while the box is indeterminate, and kept until the box is checked, so a mark that animates out leaves as the dash it was.
 * @csspart mark-indeterminate - Added to `mark` while the box is indeterminate.
 *
 * @cssstate checked - While the box is checked.
 * @cssstate has-check - An icon is slotted into `check`.
 * @cssstate has-dash - An icon is slotted into `dash`.
 * @cssstate has-label - The label slot has content, so the label is drawn.
 * @cssstate indeterminate - While the box shows the dash, neither checked nor unchecked.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
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

  /** A click on the element itself, `click()` or a page's `<label for>`, toggles it. */
  protected readonly clicks = new HostClickController(this, () => this.partNamed('control'))

  /**
   * Shows the box as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   *
   * Not reflected, as no state is: the element resolves it itself, and a
   * reflected one removed the attribute the consumer wrote. A stylesheet
   * reads it as `:state(indeterminate)`.
   */
  @property({ type: Boolean })
  indeterminate = false

  /**
   * The value submitted when the box is checked.
   */
  @property()
  value = 'on'

  /**
   * Whether the mark draws the dash: from the moment the box is indeterminate
   * until it is checked.
   *
   * **Kept past indeterminate, so a mark leaving the box leaves as what it
   * was.** A stylesheet that shrinks the mark away drew the tick in the dash's
   * place for the whole exit, since the shape is a mask and a mask swaps at
   * once. Measured on Data Table's select-all, deselecting the one row that
   * was selected: 15 frames of a shrinking tick where the dash had been.
   */
  private dashed = false

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
    const taken = this.requestChecked(next)
    if (taken) {
      this.indeterminate = false
    }
    input.checked = this.checked
    // A refused change changed nothing, so there is no `change` to send.
    if (taken) {
      this.relayNativeEvent(event)
    }
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.checked ? this.value : null)
    this.reportRequired(!this.checked, 'Tick this box to continue.', 'control')
  }

  /** Resets the box to the state set in its markup. */
  override formResetCallback(): void {
    super.formResetCallback()
    this.indeterminate = false
    // `resetChecked` drops both halves, the consumer's and the element's, so
    // there is nothing to clear before it.
    this.resetChecked()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaRequired = this.required ? 'true' : null
    this.toggleState('indeterminate', this.indeterminate)
    if (this.indeterminate) {
      this.dashed = true
    } else if (this.checked) {
      this.dashed = false
    }
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
   * property would unlabel every
   * `<helix-headless-checkbox>Text</helix-headless-checkbox>` ever written.
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
   * Records which of the mark's slots hold an icon, as `:state(has-check)` and
   * `:state(has-dash)`, so a stylesheet drops its own drawing of that shape.
   * A state, for the reason `:state(has-label)` is one.
   */
  private readonly handleMarkChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement
    const filled = slot.assignedNodes().length > 0
    if (slot.name === 'dash') {
      this.toggleState('has-dash', filled)
    } else {
      this.toggleState('has-check', filled)
    }
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
    const meaningful = (node: Node): boolean =>
      node.textContent?.trim() !== '' || node.nodeType === Node.ELEMENT_NODE
    const filled = (slot?.assignedNodes({ flatten: true }) ?? []).some(meaningful)
    /* A name that is not shown is no label to leave room for. Content the
       consumer wrote wins over the host's `aria-label`, as it does in the
       platform's own `<label>`, so the clip only holds while the slot is empty. */
    const hidden =
      this.label === '' &&
      Boolean(this.getAttribute('aria-label')) &&
      !(slot?.assignedNodes() ?? []).some(meaningful)
    this.partNamed('label')?.toggleAttribute('data-hidden', hidden)
    this.toggleState('has-label', filled && !hidden)
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
    /* **`aria-label` names without showing**, the rule every field follows:
       the attribute on the host reaches nothing, since the name a reader hears
       is the input's and the input is named by this `<label>`. Measured in
       Chromium's own tree, Data Table's row boxes were each a `checkbox` with
       no name while "Select asset-001.webp" sat on the host around it. So the
       words are drawn into the label and clipped, and the name arrives through
       the same `<label>` a visible one does. */
    const named = this.label === '' ? this.getAttribute('aria-label') : null
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
          aria-invalid=${this.invalidity ?? nothing}
          aria-readonly=${this.readOnly ? 'true' : nothing}
          @change=${this.handleChange}
          @click=${this.holdReadOnly}
          @input=${this.stopInner}
        />
        <span
          part="mark${this.checked ? ' mark-checked' : ''}${this.indeterminate ? ' mark-indeterminate' : ''}${this.dashed ? ' mark-dash' : ''}"
          aria-hidden="true"
          >${
            /* One slot at a time, since a slot holds its content on screen
               whatever its own `hidden` says, and this tier has no sheet. */
            this.dashed
              ? html`<slot name="dash" @slotchange=${this.handleMarkChange}></slot>`
              : html`<slot name="check" @slotchange=${this.handleMarkChange}></slot>`
          }</span
        >
      </span>
      <span part="label" ?data-hidden=${named !== null}
        ><slot @slotchange=${this.handleLabelChange}>${this.label || named}</slot></span
      >
    </label>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-checkbox': HelixHeadlessCheckbox
  }
}
