import {
  customElement,
  DisabledCascadeController,
  HelixBeforeChangeEvent,
  type HelixBeforeToggleEvent,
  HelixFormElement,
  hostAria,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessCheckbox } from '../../checkbox/root/checkbox-root.js'

/**
 * @summary Groups related checkboxes, and reports them as one set.
 *
 * @description
 * The host is the group, so `role="group"` sits on it through internals and
 * `label` names it. A run of checkboxes with no name is announced as separate
 * controls, which is what the grouping exists to say it is not.
 *
 * **Each checkbox still submits itself.** They are form-associated already and
 * a native group is several inputs sharing a name, so this adds no form value
 * of its own: it would submit the same answers twice. What it adds is the
 * grouping, a shared `name` so it is written once, and one place to read and
 * write the whole set.
 *
 * `value` is the checked values, comma separated, in the order the boxes are
 * written. Setting it ticks exactly those and unticks the rest.
 *
 * **Its message is always given, never derived.** The group is form-associated
 * for validity alone and never calls `setFormValue`, so `feedback` is what shows
 * here: the browser has nothing to say about a set it does not submit.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Checkbox list, Multi-select
 * @documentation https://helix.fusion.dev/components/checkbox-group
 *
 * @slot - The checkboxes.
 * @slot hint - Richer than a string.
 * @slot label - Richer than a string, where the label is more than one.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before any box changes, with the whole set. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart feedback - What is wrong with it.
 * @csspart hint - Help under the set.
 * @csspart items - The list itself, which is what `orientation` lays out.
 * @csspart label - The group's name, over the set.
 */
@customElement('helix-headless-checkbox-group')
export class HelixHeadlessCheckboxGroup extends MixinField(HelixFormElement) {
  /* `name` is inherited from `HelixFormElement`, reflected and with the
     converter that makes an empty one absent rather than `name=""`. What it
     means differs slightly and the property does not: the group submits nothing
     under it, and hands it to every box that has none. */

  /**
   * The checked values, comma separated.
   */
  @property()
  value = ''

  /* Stated once, and the group never thinks about it again. The controller is
     what stops the cascade being hand-called from whichever methods a component
     happens to have. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.boxes,
  })

  /** The boxes, in light-DOM order. Client only: the server has no tree. */
  get boxes(): HelixHeadlessCheckbox[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessCheckbox => child instanceof HelixHeadlessCheckbox,
    )
  }

  /**
   * Pushes the group's name and value onto the boxes.
   *
   * As properties rather than attributes. A `name` written onto a box is a
   * change to markup the consumer rendered, which a React consumer's hydration
   * reports and does not patch up. A box that names itself keeps its own.
   */
  private sync(): void {
    const wanted = new Set(
      this.value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    )
    for (const box of this.boxes) {
      if (this.name !== '' && box.name === '') {
        box.name = this.name
      }
      box.checked = wanted.has(box.value)
    }
  }

  /** Whether `seed` has had its one chance. */
  private seeded = false

  /**
   * Reads the boxes' own state into `value`, once, before anything is pushed.
   *
   * Seeding, and never a guard in `sync` refusing to write while `value` is
   * empty. The guard would answer the same case, a group written with no `value`
   * whose boxes declare their own `checked` being cleared on the first update,
   * and it also makes `group.value = ''` do nothing at all: the obvious way to
   * clear a group would silently not, and the last box could not be unticked
   * through the group either.
   *
   * The markup decides the starting set, and from then on `value` is what the
   * boxes follow, including when it is empty. The group's `value` is a derived
   * read of the boxes rather than state it owns, so reading it out of them at
   * the start is what it already means.
   */
  private seed(): void {
    const checked = this.boxes.filter((box) => box.checked).map((box) => box.value)
    if (checked.length > 0) {
      this.value = checked.join(',')
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
   * The requested state comes from the event rather than from the box. Driving
   * the boxes from `value` makes them controlled, so a controlled box applies
   * nothing on its own and reports what it was asked for. Reading `checked`
   * here would read the state it still holds and nothing would ever change.
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

    const wanted = (event as HelixBeforeToggleEvent).detail.checked
    /* Announced before it is written, never after: dispatching once the group's
       value has moved leaves `preventDefault()` refusing a set that has already
       changed.

       Hand-rolled rather than through `MixinControllerValue`, and that is a
       decision rather than an omission. The group's `value` is a derived read of
       the boxes rather than state it owns, so there is nothing for the mixin to
       control.

       The boxes have already moved either way. Each answered the reader before
       this ran, so refusing here stops only the group's value from following. */
    const next = this.boxes
      .filter((box) => (box === changed ? wanted : box.checked))
      .map((box) => box.value)
      .join(',')

    if (!this.dispatchEvent(new HelixBeforeChangeEvent({ value: next }))) {
      return
    }
    this.value = next
    /* Under the platform's own name, after the value has moved, so a consumer
       binding `onChange` reads the group's new value off the target.

       `input` beside it, because this is a discrete control and that is the
       pair a native `<select>` sends and the pair every other discrete control
       here sends through `MixinControllerValue`. */
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: false }))
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
    if (event.target !== this) {
      event.stopImmediatePropagation()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-before-toggle', this.handleToggle)
    this.addEventListener('change', this.handleMemberNative)
    this.addEventListener('input', this.handleMemberNative)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-before-toggle', this.handleToggle)
    this.removeEventListener('change', this.handleMemberNative)
    this.removeEventListener('input', this.handleMemberNative)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The string half, which is what a server can write. `linkHost` adds the
       element references on the client, and those win where a consumer slotted
       a label richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'group' })
    this.internals.ariaRequired = this.required ? 'true' : null
    /* Before the first `sync`, and only ever once: after this the group's value
       is what the boxes follow. Before the render too, so the first one has it.
       Client only, the server having no boxes to read, and not while hydrating
       what a server rendered without them. */
    if (!this.seeded && this.children !== undefined && !this.hydrating) {
      this.seeded = true
      if (this.value === '') {
        this.seed()
      }
    }
  }

  /* Where hydrating skipped the seed, it happens here: after the render, which
     had to match the server's, and before `updated` pushes the empty value onto
     the boxes and clears the very state this reads. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (!this.seeded && this.children !== undefined) {
      this.seeded = true
      if (this.value === '') {
        this.seed()
      }
    }
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
   * Anchored on the list, because the browser needs somewhere to point the
   * bubble.
   */
  private validate(): void {
    this.reportRequired(this.value === '', 'Choose at least one to continue.', 'items')
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.validate()
    this.sync()
    this.linkHost()
  }

  protected override render(): TemplateResult {
    /* The list is an element of its own, because the label and the hint are the
       host's children too and `orientation` lays out whatever is in the flex
       container. On the host, a horizontal group would have put its own label
       in the row beside the first box. */
    return html`${this.renderGroupLabel()}
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
