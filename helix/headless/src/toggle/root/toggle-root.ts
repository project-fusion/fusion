import { customElement, HelixElement, HelixSelectionChangeEvent } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Renders an `<a>` when given an `href` and a `<button role="radio">`
 * otherwise, which is what lets one component serve both a set of options and a
 * navigation bar without either being a lie. A nav item that announces itself
 * as a radio is wrong, and so is a link that cannot be opened in a new tab.
 *
 * The selected item carries `aria-current="page"` in the link form and
 * `aria-checked` in the radio form, because those are the words each context
 * uses for the same idea.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Segment, NavItem, Option
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The item's label.
 *
 * @csspart item - The button or anchor.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when the item is chosen.
 */
@customElement('helix-base-toggle')
export class HelixBaseToggle extends HelixElement {
  /** Identifies the item to the group. */
  @property()
  value = ''

  /** Makes the item a link rather than a radio. */
  @property()
  href = ''

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
    if (this.href) {
      return html`<a
        part="item"
        href=${this.disabled ? nothing : this.href}
        aria-current=${this.selected ? 'page' : nothing}
        tabindex=${this.selected ? '0' : '-1'}
        @click=${() => this.select()}
        ><slot></slot
      ></a>`
    }

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
