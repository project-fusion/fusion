import {
  customElement,
  DisabledCascadeController,
  HelixChangeEvent,
  HelixElement,
  hostAria,
  MixinField,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseCheckbox } from '../../checkbox/root/checkbox-root.js'

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
 * @since 0.1.0
 * @status experimental
 * @aliases Checkbox list, Multi-select
 * @documentation https://helix.fusion.dev/components/checkbox-group
 *
 * **Its message is always given, never derived.** Every form-related member of
 * `ElementInternals` throws on an element that is not form-associated, and this
 * one is not, on purpose: the boxes submit themselves. So `feedback` is what
 * shows here, and the browser has nothing to say about a set it does not know
 * is a set.
 *
 * @slot - The checkboxes.
 * @slot label - Richer than a string, where the label is more than one.
 * @slot hint - Richer than a string.
 *
 * @csspart label - The group's name, over the set.
 * @csspart items - The list itself, which is what `orientation` lays out.
 * @csspart hint - Help under the set.
 * @csspart feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when any box changes, with the whole set.
 */
@customElement('helix-base-checkbox-group')
export class HelixBaseCheckboxGroup extends MixinField(HelixElement) {
  /**
   * Whether the whole set is out of play.
   *
   * Its own property rather than an inherited one, because this group is not
   * form-associated and `disabled` arrives with `HelixFormElement`. The boxes
   * are each form-associated and have their own, which is exactly why the two
   * have to be reconciled rather than simply written over.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Name submitted with the form, given to every box that has none. */
  @property()
  name = ''

  /** The checked values, comma separated. */
  @property()
  value = ''

  /* Stated once, and the group never thinks about it again. See the
     controller: the cascade was four hand calls from four different
     methods, so which paths reached it differed by component and a fifth
     group would have got none at all. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.boxes,
  })

  /** The boxes, in light-DOM order. Client only: the server has no tree. */
  get boxes(): HelixBaseCheckbox[] {
    return [...this.children].filter(
      (child): child is HelixBaseCheckbox => child instanceof HelixBaseCheckbox,
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
      if (this.value !== '' || wanted.size > 0) {
        box.checked = wanted.has(box.value)
      }
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
  private readonly handleChange = (event: Event): void => {
    const target = event.target
    const changed = this.boxes.find((box) => box === target)
    if (!changed) {
      return
    }
    // Immediate, not just `stopPropagation`. That one stops the event reaching
    // ancestors and does nothing about the other listeners on this same host,
    // which is where a consumer of the group puts theirs: they would get the
    // box's lone boolean as well as the set.
    event.stopImmediatePropagation()

    const wanted = (event as CustomEvent<{ value: string }>).detail.value === 'true'
    /* Announced before it is written, which is the way round it was not: the
       group set its value and then dispatched, so `preventDefault()` refused a
       set that had already changed.

       Hand-rolled rather than through `MixinControllerValue`, and that is the
       decision rather than an omission. The group is deliberately not
       form-associated: its boxes are the form controls and each submits itself,
       so the mixin, which is constrained to `HelixFormElement`, does not apply
       to it. Its `value` is a derived read of the boxes rather than state it
       owns, which is also why it is not controllable and why that is written
       down rather than fixed.

       The boxes have already moved either way. Each answered the reader before
       this ran, so refusing here stops the group's value from following, and
       the honest limit of that is recorded with the decision. */
    const next = this.boxes
      .filter((box) => (box === changed ? wanted : box.checked))
      .map((box) => box.value)
      .join(',')

    if (!this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: next }))) {
      return
    }
    this.value = next
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-change', this.handleChange)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-change', this.handleChange)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The string half, which is what a server can write. `linkHost` adds the
       element references on the client, and those win where a consumer slotted
       a label richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.linkHost()
  }

  protected override render(): TemplateResult {
    /* The list is an element of its own, because the label and the hint are the
       host's children too and `orientation` lays out whatever is in the flex
       container. On the host, a horizontal group would have put its own label
       in the row beside the first box. */
    return html`${this.renderGroupLabel()}
      <div part="items"><slot></slot></div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-checkbox-group': HelixBaseCheckboxGroup
  }
}
