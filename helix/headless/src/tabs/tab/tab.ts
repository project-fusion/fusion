import { customElement, HelixElement, MixinSelectableItem } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'

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
 * @status stable
 * @aliases Tab
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tab's label.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the tab is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart tab - The tab itself.
 *
 * @cssstate selected - While it is the tab selected.
 */
@customElement('helix-headless-tab')
export class HelixHeadlessTab extends MixinSelectableItem(HelixElement) {
  /* The control is a `<button role="tab">` and the part is named for what it
     is, so the one thing the shared item has to know is said here. */
  protected override itemPart = 'tab'

  protected override render(): TemplateResult {
    /* No `aria-controls`, and no id for one to point at.
     *
     * An IDREF resolves only within the tree it is written in, and the panel's
     * id is rendered inside the panel's *own* shadow root, so an `aria-controls`
     * here would point at nothing on every tab.
     *
     * There is no id form that could work and no element reference either: a
     * reference is valid only into the same tree or a shadow-including ancestor
     * of it, and the panel's shadow root is neither, it is a sibling. The
     * relationship a reader actually needs is the panel's name, and the panel
     * takes that as a string, which crosses anything. */
    return html`<button
      part="tab"
      role="tab"
      type="button"
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
    'helix-headless-tab': HelixHeadlessTab
  }
}
