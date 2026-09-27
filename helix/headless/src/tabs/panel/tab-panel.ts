import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * An inactive panel is hidden and stays mounted. Anything typed into it is
 * still there when the person comes back, and the content of every panel is in
 * the server-rendered markup for crawlers, whichever tab is open.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TabPanel
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container.
 *
 * @cssstate selected - While its tab is the one selected.
 */
@customElement('helix-headless-tab-panel')
export class HelixHeadlessTabPanel extends HelixElement {
  /**
   * The name of the panel, which is the text of the tab that opens it.
   *
   * Set by the root, which is the only thing that sees both. No attribute,
   * because it is coordination between elements rather than anything a consumer
   * writes: the tab already says it.
   *
   * A string and not a reference: an IDREF resolves only in the tree it is
   * written in, and an element reference cannot reach a sibling shadow tree
   * either, so `aria-labelledby` to the tab's own id leaves the panel with no
   * accessible name. `aria-label` on a `tabpanel` is how the pattern names one
   * anyway.
   */
  @property({ attribute: false })
  label = ''

  /**
   * Whether this panel is the visible one.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Pairs the panel with the tab of the same value.
   */
  @property()
  value = ''

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state, never a reflected `selected` attribute.** The parent
   * writes this, so reflecting it would put the element's own bookkeeping onto
   * markup a consumer wrote and their server never sent, which React reports as
   * a hydration mismatch and which a serialized element pasted back declares as
   * a choice nobody made. `ElementInternals` holds it instead.
   *
   * The attribute still seeds the property, which is what
   * `<helix-headless-tab-panel selected>` in a consumer's markup means. Only
   * the write back is gone.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
  }

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
    'helix-headless-tab-panel': HelixHeadlessTabPanel
  }
}
