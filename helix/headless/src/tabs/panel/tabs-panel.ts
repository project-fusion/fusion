import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * Hidden rather than unmounted when inactive, so anything typed into a panel is
 * still there when the reader comes back to it, and so the content is in the
 * server's markup for a crawler regardless of which tab is open.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TabPanel
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container.
 */
@customElement('helix-base-tabs-panel')
export class HelixBaseTabsPanel extends HelixElement {
  /** Pairs the panel with the tab of the same value. */
  @property()
  value = ''

  /** Whether this panel is the visible one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  protected override render(): TemplateResult {
    return html`<div
      part="panel"
      id=${`panel-${this.value}`}
      role="tabpanel"
      aria-labelledby=${`tab-${this.value}`}
      ?hidden=${!this.selected}
      tabindex="0"
    >
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tabs-panel': HelixBaseTabsPanel
  }
}
