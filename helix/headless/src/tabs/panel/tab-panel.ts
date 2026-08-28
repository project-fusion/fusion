import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
@customElement('helix-headless-tab-panel')
export class HelixHeadlessTabPanel extends HelixElement {
  /**
   * Pairs the panel with the tab of the same value.
   */
  @property()
  value = ''

  /**
   * Whether this panel is the visible one.
   */
  @property({ type: Boolean })
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

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state and not the `selected` attribute it used to reflect.** The
   * parent writes this: a listbox choosing a row, a tab strip moving the tab, a
   * radio group answering for its set. Reflected, that put the element's own
   * bookkeeping onto markup a consumer wrote and a consumer's server never sent,
   * which React reconciles and reports as a mismatch, and which a serialized
   * element pasted back declares as a choice nobody made. `ElementInternals`
   * holds it instead, where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-tab-panel selected>` in a consumer's
   * markup means. What stops is the write back. See 302 and 304.
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
