import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * An element rather than a slot because it owns selection and its own tab stop.
 *
 * Its id and the id it controls are both derived from `value`, so the pairing
 * between a tab and its panel survives server rendering. A generated id would
 * differ between the server's render and the client's and break the link, and
 * `aria-controls` pointing at nothing is worse than not being there.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Tab
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The tab's label.
 *
 * @csspart tab - The tab itself.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the tab is chosen.
 */
@customElement('helix-base-tabs-tab')
export class HelixBaseTabsTab extends HelixElement {
  /** Identifies the tab, and pairs it with the panel of the same value. */
  @property()
  value = ''

  /** Whether this tab is the current one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Whether the tab can be chosen. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Moves focus to this tab. */
  focusTab(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="tab"]')?.focus()
  }

  /** Selects this tab and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  protected override render(): TemplateResult {
    return html`<button
      part="tab"
      id=${`tab-${this.value}`}
      role="tab"
      type="button"
      aria-controls=${`panel-${this.value}`}
      aria-selected=${this.selected ? 'true' : 'false'}
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
    'helix-base-tabs-tab': HelixBaseTabsTab
  }
}
