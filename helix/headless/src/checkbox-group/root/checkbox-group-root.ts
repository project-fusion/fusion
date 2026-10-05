import {
  customElement,
  DisabledCascadeController,
  HelixBeforeChangeEvent,
  type HelixBeforeToggleEvent,
  HelixFormElement,
  hostAria,
  MixinField,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type ReactiveController, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessCheckbox } from '../../checkbox/root/checkbox-root.js'

/**
 * @summary A group of related checkboxes under one label, with one value for the set.
 *
 * @description
 * The host is the group. It has `role="group"` through internals, and `label`
 * names it. Without a name, screen readers announce the checkboxes as separate
 * controls.
 *
 * **Each checkbox submits its own value.** Checkboxes are already
 * form-associated, and a native group is several inputs that share a name, so
 * the group adds no form value of its own. It adds the grouping, a shared
 * `name` that you write once, and one place to read and write the whole set.
 *
 * `value` is the checked values, separated by commas, in the order the
 * checkboxes are written, read from the boxes themselves. Setting it checks
 * exactly those values and unchecks the rest.
 *
 * `select-all` draws a box above the set that checks every enabled box, or
 * unchecks them all once every one is checked. It shows a dash while only some
 * are checked, and changes the set through the same cancelable
 * `helix-before-change` a box does.
 *
 * A checkbox is a member wherever it sits inside the group, in a row or a grid
 * cell of your own, unless another group inside this one holds it. A field of
 * another kind inside the group, such as an "Other" text field, sends its own
 * `input` and `change` past the group.
 *
 * **The group shows the message you set in `feedback`.** It is form-associated
 * only for validity and never calls `setFormValue`, so the browser does not
 * generate a message for it.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Checkbox list, Multi-select
 * @documentation https://fusion.dev/helix/components/checkbox-group
 *
 * @slot - The checkboxes, and anything laid out around them.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the checkboxes, for help that needs more than plain text.
 * @slot label - The group's label, for a label that needs more than plain text.
 *
 * @event {Event} change - The set of checked boxes changed.
 * @event {HelixBeforeChangeEvent} helix-before-change - A box is about to change. Carries the whole set that would result. Cancelable: canceling it leaves every box as it was.
 * @event {Event} input - The set of checked boxes changed.
 *
 * @csspart feedback - The message that says what is wrong with the set.
 * @csspart hint - The help under the checkboxes.
 * @csspart items - The element that holds the checkboxes, laid out by `orientation`.
 * @csspart label - The group's label, above the checkboxes.
 * @csspart select-all - The box that checks or unchecks every box, under `select-all`.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-checkbox-group')
export class HelixHeadlessCheckboxGroup extends MixinField(HelixFormElement) {
  /* `name` is inherited from `HelixFormElement`, reflected and with the
     converter that makes an empty one absent rather than `name=""`. What it
     means differs slightly and the property does not: the group submits nothing
     under it, and hands it to every box that has none. */

  /**
   * The checked values, comma separated.
   *
   * Read from the boxes once they are known, so a box a script ticks directly
   * is in it at once. Written, it is pushed onto the boxes. A box whose value
   * holds a comma cannot be named here: use `values`.
   */
  @property()
  get value(): string {
    return this.values.join(',')
  }

  set value(next: string) {
    this.values = next
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  /**
   * Whether a box above the set checks or unchecks every enabled box.
   */
  @property({ attribute: 'select-all', type: Boolean })
  selectAll = false

  /**
   * The words beside the box `select-all` draws.
   */
  @property({ attribute: 'select-all-label' })
  selectAllLabel = 'Select all'

  /**
   * The checked values, as a list, in the order the boxes are written.
   *
   * The same set as `value`, and the one to use where a value may hold a
   * comma. Written, it checks exactly those boxes and unchecks the rest.
   */
  @property({ attribute: false })
  get values(): string[] {
    if (this.pending || !this.hasUpdated || !this.childrenKnown) {
      return [...this.declared]
    }
    const boxes = this.boxes
    return boxes.length === 0
      ? [...this.declared]
      : boxes.filter((box) => box.checked).map((box) => box.value)
  }

  set values(next: string[]) {
    const previous = this.value
    this.declared = [...next]
    this.pending = true
    this.requestUpdate('value', previous)
  }

  /** The values last written, which the boxes are given at the next update. */
  private declared: string[] = []

  /**
   * Whether `declared` has yet to reach the boxes.
   *
   * **Pushed once and then left alone**, which is the fix for a box a script
   * ticked being unticked by the next unrelated update: every update used to
   * push the group's value onto every box, whatever the boxes said since.
   */
  private pending = false

  /** Watches for boxes arriving inside a wrapper, which no slot reports. */
  private observer: MutationObserver | undefined

  /** The value the required check last judged. */
  private judged: string | undefined

  /** The boxes `member` is added to. */
  private readonly watched = new Set<HelixHeadlessCheckbox>()

  /**
   * Asks for an update when a box's own update moved the set.
   *
   * **A controller on each box, because a box changed by a script says
   * nothing.** `box.checked = false` sends no event, as on a native checkbox,
   * so the group heard of it only at its next unrelated update: a required
   * group whose last box a script unchecked still passed `checkValidity()` and
   * let its form submit. A box's update is the one thing every change to its
   * state goes through, whatever made it.
   */
  private readonly member: ReactiveController = {
    hostUpdated: () => {
      /* And under `select-all` on every box update, since the box above the
         set draws what the boxes hold once they have taken a new value. */
      if (this.isConnected && (this.selectAll || this.value !== this.judged)) {
        this.requestUpdate()
      }
    },
  }

  /* Stated once, and the group never thinks about it again. The controller is
     what stops the cascade being hand-called from whichever methods a component
     happens to have. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.boxes,
  })

  /**
   * The checkboxes in the group, in the order they are written. Browser only.
   *
   * Descendants rather than children, so a box inside a layout wrapper of the
   * consumer's is a member: only direct children counted, and a box in a row
   * with a description got no name and no place in the set. A box held by a
   * group nested inside this one is that group's.
   */
  get boxes(): HelixHeadlessCheckbox[] {
    return [...this.querySelectorAll('*')].filter(
      (element): element is HelixHeadlessCheckbox =>
        element instanceof HelixHeadlessCheckbox && this.holds(element),
    )
  }

  /** Whether this is the nearest group around `box`. */
  private holds(box: Element): boolean {
    let parent = box.parentElement
    while (parent && parent !== this) {
      if (parent instanceof HelixHeadlessCheckboxGroup) {
        return false
      }
      parent = parent.parentElement
    }
    return parent === this
  }

  /**
   * Pushes the group's name onto the boxes, and its value where one is waiting.
   *
   * As properties rather than attributes. A `name` written onto a box is a
   * change to markup the consumer rendered, which a React consumer's hydration
   * reports and does not patch up. A box that names itself keeps its own.
   *
   * **Nothing is pushed for a value nobody wrote**, so a group written with no
   * `value` keeps what its boxes declare, and `group.value = ''` still clears
   * every box, being a value somebody wrote.
   */
  private sync(): void {
    const boxes = this.boxes
    for (const box of boxes) {
      if (this.name !== '' && box.name === '') {
        box.name = this.name
      }
      if (!this.watched.has(box)) {
        box.addController(this.member)
        this.watched.add(box)
      }
    }
    for (const box of this.watched) {
      if (!boxes.includes(box)) {
        this.unwatch(box)
      }
    }
    if (!this.pending || boxes.length === 0) {
      return
    }
    this.pending = false
    const wanted = new Set(this.declared)
    for (const box of boxes) {
      box.checked = wanted.has(box.value)
    }
  }

  /**
   * Reads a box's requested change into `value`, and says so once.
   *
   * The box is found from the event's target, which does two things. It tells
   * the group which box asked, where the detail carries only the shared name.
   * And it ignores the group's own dispatch, which lands on this same listener
   * because the group is what it is dispatched from: without the guard the
   * group answers itself until the stack gives out.
   *
   * The requested state comes from the event rather than from the box.
   * `helix-before-toggle` is dispatched before the box applies, so reading
   * `checked` here would read the state it still holds and nothing would ever
   * change.
   */
  private readonly handleToggle = (event: Event): void => {
    const target = event.target
    const changed = this.boxes.find((box) => box === target)
    if (!changed) {
      return
    }
    /* A box's `helix-before-toggle` bubbles, and the group is the single voice
       for the set: a consumer listening here wants the whole answer, not one
       box's half of it. */
    event.stopImmediatePropagation()
    /* **And only if the box's own request stood.** A consumer listening on the
       box refuses at the target phase, which is before this bubble listener
       runs, and the box then applies nothing. Read it here or the group records
       a box that never moved: the set would carry a value no checkbox in it
       agrees with, and the form would submit the group's answer beside the
       boxes' own. */
    if (event.defaultPrevented) {
      return
    }

    const wanted = (event as HelixBeforeToggleEvent).detail.checked
    /* Announced before it is written, never after: dispatching once the group's
       value has moved leaves `preventDefault()` refusing a set that has already
       changed.

       Hand-rolled rather than through `MixinControllerValue`, and that is a
       decision rather than an omission. The group's `value` is a derived read of
       the boxes rather than state it owns, so there is nothing for the mixin to
       control.

       A refusal here refuses the box's own request too, which it reads once
       this listener returns: the group's value is read from the boxes, so a
       box that moved anyway would carry the refused set into it. */
    const next = this.boxes
      .filter((box) => (box === changed ? wanted : box.checked))
      .map((box) => box.value)

    if (!this.dispatchEvent(new HelixBeforeChangeEvent({ value: next.join(',') }))) {
      event.preventDefault()
      return
    }
    this.values = next
    /* Under the platform's own name, after the value has moved, so a consumer
       binding `onChange` reads the group's new value off the target.

       `input` beside it, because this is a discrete control and that is the
       pair a native `<select>` sends and the pair every other discrete control
       here sends through `MixinControllerValue`. */
    this.announceInput()
    this.announceChange()
  }

  /**
   * Stops a box's own announcement, for the reason the request above is stopped.
   *
   * A box announces `input` and `change` from its own host, which is what makes
   * `onChange` work on a checkbox, and both bubble up through this group:
   * measured, one click produced `change` from the group and `input` and
   * `change` from the box, all three at a consumer listening here, two of them
   * describing one box rather than the set.
   *
   * `stopImmediatePropagation` and not `stopPropagation`: the box's event and
   * this group's own carry one name from what a consumer sees as one element,
   * so stopping propagation alone still leaves every other listener on this
   * host receiving both.
   *
   * A listener on the box itself is unaffected, which is where per-box handling
   * belongs. Each box is form-associated and submits itself; what this stops is
   * one box answering a question asked of the set.
   */
  private readonly handleMemberNative = (event: Event): void => {
    /* A member's only. Any other field inside the group, an "Other" text box,
       is a control of its own, and a form listening for its edits heard
       nothing. */
    if (event.target instanceof HelixHeadlessCheckbox && this.holds(event.target)) {
      event.stopImmediatePropagation()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-before-toggle', this.handleToggle)
    this.addEventListener('change', this.handleMemberNative)
    this.addEventListener('input', this.handleMemberNative)
    this.observer = new MutationObserver(() => this.requestUpdate())
    this.observer.observe(this, { childList: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-before-toggle', this.handleToggle)
    this.removeEventListener('change', this.handleMemberNative)
    this.removeEventListener('input', this.handleMemberNative)
    this.observer?.disconnect()
    this.observer = undefined
    for (const box of this.watched) {
      this.unwatch(box)
    }
  }

  /** Stops listening to a box that left the group. */
  private unwatch(box: HelixHeadlessCheckbox): void {
    box.removeController(this.member)
    this.watched.delete(box)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The string half, which is what a server can write. `linkHost` adds the
       element references on the client, and those win where a consumer slotted
       a label richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'group' })
    this.internals.ariaRequired = this.required ? 'true' : null
  }

  /**
   * Goes back to the set the markup started with.
   *
   * The form resets each box too, in the same task and after this, so a group
   * whose markup wrote no `value` has nothing to do: its boxes return to what
   * they declared, and its value is read from them. A `value` the markup wrote
   * is pushed again at the next update, after the boxes have reset, and an
   * update is asked for, since an unchanged value schedules none.
   */
  override formResetCallback(): void {
    super.formResetCallback()
    const declared = this.getAttribute('value')
    if (declared !== null) {
      this.value = declared
    }
    this.requestUpdate()
  }

  /**
   * Refuses an empty set where one was required.
   *
   * **The group is form-associated, and submits nothing.** Nothing here calls
   * `setFormValue`, so the set that reaches the server is exactly the boxes,
   * each of which submits itself. What form association buys is the other half
   * of participation, validity, and there is no other mechanism for it:
   * `setValidity` throws `NotSupportedError` on an element the platform does not
   * know is a control. happy-dom's shim does not throw, so a spec passes against
   * code that fails on every update in Chromium.
   *
   * It is also what makes the rest work: the form refuses to submit, which fires
   * `invalid`, which is what marks the field touched and puts the message on
   * screen.
   *
   * Anchored on the list, which takes no focus, so the base points the bubble
   * at the first box instead.
   */
  private validate(): void {
    this.judged = this.value
    this.reportRequired(this.judged === '', 'Choose at least one to continue.', 'items')
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.validate()
    this.linkHost()
  }

  /**
   * Checks every enabled box, or unchecks them all once every one is checked.
   *
   * The box's own request is refused, since the box shows what the set holds
   * and the set is moved here, through one cancelable `helix-before-change`
   * for the whole set, as a box moves it.
   */
  private readonly handleSelectAll = (event: Event): void => {
    event.preventDefault()
    event.stopPropagation()
    const enabled = this.boxes.filter((box) => !box.isDisabled)
    const every = enabled.length > 0 && enabled.every((box) => box.checked)
    const next = this.boxes
      .filter((box) => (enabled.includes(box) ? !every : box.checked))
      .map((box) => box.value)
    if (!this.dispatchEvent(new HelixBeforeChangeEvent({ value: next.join(',') }))) {
      return
    }
    this.values = next
    this.announceInput()
    this.announceChange()
  }

  /**
   * The box above the set that checks or unchecks every box, under
   * `select-all`, behind a seam a tier can move.
   *
   * Checked while every box is, and showing a dash while only some are. It is
   * in this shadow root, so it is no member of the set and submits nothing.
   */
  protected renderSelectAll(): TemplateResult | typeof nothing {
    if (!this.selectAll) {
      return nothing
    }
    const boxes = this.childrenKnown ? this.boxes : []
    const ticked = boxes.filter((box) => box.checked).length
    const every = boxes.length > 0 && ticked === boxes.length
    const box = this.tag('checkbox')
    return html`<${box}
      part="select-all"
      .checked=${every}
      .indeterminate=${ticked > 0 && !every}
      ?disabled=${this.isDisabled}
      label=${this.selectAllLabel}
      @helix-before-toggle=${this.handleSelectAll}
      @input=${(event: Event) => event.stopPropagation()}
    ></${box}>`
  }

  protected override render(): TemplateResult {
    /* The list is an element of its own, because the label and the hint are the
       host's children too and `orientation` lays out whatever is in the flex
       container. On the host, a horizontal group would have put its own label
       in the row beside the first box. */
    return html`${this.renderGroupLabel()}${this.renderSelectAll()}
      <div part="items">
        ${
          /* A box arriving after first render has neither the shared name nor
             the value's checked state until something pushes them onto it. */
          ''
        }
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-checkbox-group': HelixHeadlessCheckboxGroup
  }
}
