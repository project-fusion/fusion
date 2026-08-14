import { customElement, HelixElement, HelixSelectionChangeEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Renders a `<button role="radio">`. This is a form control and nothing else.
 *
 * It used to serve navigation too, behind a `nav` attribute on the group, and
 * that was two components wearing one name. Navigation is links marked with
 * `aria-current`, styled by the `data-nav-item` recipe in the base layer; it
 * only ever borrowed this component's *look*. Borrowing radio semantics for it
 * would have announced a set of destinations as a set of choices.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Segment, NavItem, Option
 * @documentation https://helix.fusion.dev/components/toggle
 *
 * @slot - The item's label.
 *
 * @csspart item - The radio button.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when the item is chosen.
 */
@customElement('helix-base-toggle')
export class HelixBaseToggle extends HelixElement {
  /** Identifies the item to the group. */
  @property()
  value = ''

  /** Whether this item is the current one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Whether the item can be chosen. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Moves focus to this item. */
  focusItem(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  /** Chooses this item and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectionChangeEvent({ value: this.value }))
  }

  protected override render(): TemplateResult {
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toggle': HelixBaseToggle
  }
}
