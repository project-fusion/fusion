import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
export class HelixHeadlessTab extends HelixElement {
  /**
   * Whether the tab can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether this tab is the current one.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Identifies the tab, and pairs it with the panel of the same value.
   */
  @property()
  value = ''

  /** Moves focus to this tab, for the list's arrow keys. */
  focusItem(): void {
    this.partNamed('tab')?.focus()
  }

  /** Selects this tab and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state, not a reflected `selected` attribute.** The parent writes
   * this: a listbox choosing a row, a tab strip moving the tab, a radio group
   * answering for its set. Reflected, it puts the element's own bookkeeping onto
   * markup a consumer wrote and a consumer's server never sent, which React
   * reconciles and reports as a mismatch, and which a serialized element pasted
   * back declares as a choice nobody made. `ElementInternals` holds it instead,
   * where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-tab selected>` in a consumer's
   * markup means. What stops is the write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
  }

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
