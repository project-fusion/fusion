import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Renders a `<button role="radio">`. This is a form control and nothing else.
 *
 * Navigation is not this. It is links marked with `aria-current` and styled by
 * the `data-navigation-item` recipe in the base layer, which carries the same look
 * without radio semantics announcing destinations as choices.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases Segment, NavItem, Option
 * @documentation https://helix.fusion.dev/components/toggle
 *
 * @slot - The item's label.
 *
 * @csspart item - The radio button.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen.
 */
@customElement('helix-headless-toggle')
export class HelixHeadlessToggle extends HelixElement {
  /** Identifies the item to the group. */
  @property()
  value = ''

  /**
   * Whether the markup declared this one chosen, which is what a reset returns to.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so what is captured here is what
   * the markup said at upgrade, before anything could overwrite it: read the
   * attribute later and the listbox's own writes answer instead.
   *
   * **The deeper half is 302 and is not this.** State reflecting under the
   * declaration's name is the fault `TreeItem` already avoids by mirroring to
   * `data-selected`, and four families here still write `selected` back into a
   * consumer's markup. Splitting them means moving what every stylesheet selects
   * on, which is a change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.seeded
  }

  set defaultSelected(next: boolean) {
    this.seeded = next
  }

  /** What the markup said, read once at construction for the reason above. */
  private seeded = this.hasAttribute('selected')

  /** Whether this item is the current one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Whether the item can be chosen. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Moves focus to this item's own control.
   *
   * The group drives arrow-key navigation and cannot reach the control itself,
   * which is inside this shadow root. Exposing the intent as a method keeps the
   * group out of the child's internals.
   */
  focusItem(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  /** Chooses this item and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Whether this item holds the group's tab stop while nothing is chosen.
   *
   * The stop normally rides on the selection, and an unanswered group has no
   * selection, so it had no stop and the keyboard could not reach it. Written
   * by the group, with no attribute: it is coordination between elements, and
   * `tabindex` on a host the consumer rendered is the change a React consumer's
   * hydration reports and does not patch up.
   */
  @property({ attribute: false })
  focusable = false

  protected override render(): TemplateResult {
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected || this.focusable ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toggle': HelixHeadlessToggle
  }
}
