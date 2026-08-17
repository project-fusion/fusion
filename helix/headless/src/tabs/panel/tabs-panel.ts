import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
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

  /**
   * The name of the panel, which is the text of the tab that opens it.
   *
   * Set by the root, which is the only thing that sees both. No attribute,
   * because it is coordination between elements rather than anything a consumer
   * writes: the tab already says it.
   *
   * A string where the markup wanted a reference. `aria-labelledby` named
   * `tab-${value}`, an id inside the *tab's* own shadow root, and an IDREF
   * resolves only in the tree it is written in, so the panel had no accessible
   * name at all. An element reference cannot reach there either, a sibling
   * shadow tree being neither the same tree nor an ancestor of it. A name is
   * the one form that crosses, and `aria-label` on a `tabpanel` is how the
   * pattern names one anyway.
   */
  @property({ attribute: false })
  label = ''

  protected override render(): TemplateResult {
    return html`<div
      part="panel"
      role="tabpanel"
      aria-label=${this.label || nothing}
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
