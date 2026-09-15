import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart item - The radio button.
 *
 * @cssstate selected - While it is on.
 */
@customElement('helix-headless-toggle')
export class HelixHeadlessToggle extends HelixElement {
  /**
   * Whether the item can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the markup declared this one chosen, which is what a reset returns to.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so what is captured here is what
   * the markup said at upgrade, before anything could overwrite it: read the
   * attribute later and the listbox's own writes answer instead.
   *
   * **The deeper half is not this.** State reflecting under the declaration's
   * name is the fault `TreeItem` avoids by mirroring to `data-selected`.
   * Splitting them means moving what every stylesheet selects on, which is a
   * change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.seeded
  }

  set defaultSelected(next: boolean) {
    this.seeded = next
  }

  /** What the markup said, read once at construction for the reason above. */
  private seeded = this.hasAttribute('selected')

  /**
   * Whether this item holds the group's tab stop while nothing is chosen.
   *
   * The stop normally rides on the selection, and an unanswered group has no
   * selection, so without this the keyboard cannot reach it. Written by the
   * group, with no attribute: it is coordination between elements, and
   * `tabindex` on a host the consumer rendered is the change a React consumer's
   * hydration reports and does not patch up.
   */
  @property({ attribute: false })
  focusable = false

  /**
   * Whether this item is the current one.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Moves focus to this item's own control.
   *
   * The group drives arrow-key navigation and cannot reach the control itself,
   * which is inside this shadow root. Exposing the intent as a method keeps the
   * group out of the child's internals.
   */
  focusItem(): void {
    this.partNamed('item')?.focus()
  }

  /** Chooses this item and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Identifies the item to the group.
   */
  @property()
  value = ''

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state rather than the `selected` attribute.** The parent writes
   * this: a listbox choosing a row, a tab strip moving the tab, a radio group
   * answering for its set. Reflected, that puts the element's own bookkeeping
   * onto markup a consumer wrote and a consumer's server never sent, which
   * React reconciles and reports as a mismatch, and which a serialized element
   * pasted back declares as a choice nobody made. `ElementInternals` holds it
   * instead, where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-toggle selected>` in a consumer's
   * markup means. There is no write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
  }

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
