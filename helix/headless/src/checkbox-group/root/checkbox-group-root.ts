import { customElement, HelixChangeEvent, HelixElement } from '@helix-io/core'
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
 * @slot - The checkboxes.
 *
 * @event {HelixChangeEvent} helix-change - Fired when any box changes, with the whole set.
 */
@customElement('helix-base-checkbox-group')
export class HelixBaseCheckboxGroup extends HelixElement {
  /** Accessible name for the group. */
  @property()
  label = ''

  /** Name submitted with the form, given to every box that has none. */
  @property()
  name = ''

  /** The checked values, comma separated. */
  @property()
  value = ''

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
   * nothing on its own and reports what it was asked for. Reading `isChecked`
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
    this.value = this.boxes
      .filter((box) => (box === changed ? wanted : box.isChecked))
      .map((box) => box.value)
      .join(',')
    this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: this.value }))
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
    this.internals.role = 'group'
    this.internals.ariaLabel = this.label || null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-checkbox-group': HelixBaseCheckboxGroup
  }
}
