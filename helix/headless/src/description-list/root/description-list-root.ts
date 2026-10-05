import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A list of labels and their values, such as a details panel.
 *
 * @description
 * Renders a `<dl>`, with each item's label as a `<dt>` and its value as a
 * `<dd>`, for panels such as "Owner: Ada, Region: us-east, Created: 3 days
 * ago". A screen reader announces which label goes with which value and how
 * many pairs there are.
 *
 * **Each item renders its own term and description**, and the list takes the
 * items through its slot. The accessibility tree is built from the flattened
 * tree, so the pairs appear inside the list. Measured in Chromium, the result
 * matches a plain `<dl>` with the same content node for node, both with a
 * slotted label and with an item set to `display: contents`.
 *
 * **A named list is a named group.** A `<dl>` takes no name in ARIA 1.2, so
 * the list becomes a group around it when it has `label`, `aria-label` or
 * `aria-labelledby`, and the name lands on the group. Unnamed, the host adds
 * nothing to the tree.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Data list, Key-value list, Details, Properties
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @slot - The items.
 *
 * @csspart list - The `<dl>` holding the items.
 */
@customElement('helix-headless-description-list')
export class HelixHeadlessDescriptionList extends HelixElement {
  /**
   * Whether each label sits over its value or beside it.
   *
   * Absent is a column, the label over the value, which fits any width and is
   * how a narrow panel reads. `row` puts every label in one column and every
   * value in the next, which is how a wide panel is scanned: down the labels to
   * the one wanted, then across.
   *
   * On the list rather than on each item, because beside only reads when the
   * labels line up, and lining up is a fact about all of them.
   *
   * **Optional rather than defaulted to `column`**, for the reason `Stat` gives:
   * a reflecting default writes an attribute onto markup the consumer rendered,
   * and React reports that as a hydration mismatch.
   */
  @property({ reflect: true })
  direction?: 'row'

  /**
   * The list's name, read by screen readers, such as "Server details". It
   * makes the list a named group.
   */
  @property()
  label = ''

  /**
   * Hears a name written on the element, which no property mirrors.
   *
   * Lit observes the attributes of its own properties only, and `ariaLabel`
   * and `ariaLabelledByElements` belong to the platform.
   */
  static override get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: super runs Lit's getter with the subclass as this, so a styled list keeps its own attributes, where the class name would read the base's
    return [...super.observedAttributes, 'aria-label', 'aria-labelledby']
  }

  /**
   * Called by the browser when an observed attribute changes. A name written
   * or taken off asks for an update, because it decides whether the list is a
   * group.
   */
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value)
    if (name === 'aria-label' || name === 'aria-labelledby') {
      this.requestUpdate()
    }
  }

  /** Whether anything names the list. */
  private get named(): boolean {
    return (
      this.label !== '' ||
      Boolean(this.getAttribute?.('aria-label')) ||
      Boolean(this.getAttribute?.('aria-labelledby'))
    )
  }

  /* Said through `ElementInternals`, so nothing is written onto the host. In
     `willUpdate`, which a server calls too. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: this.named ? 'group' : '' })
  }

  protected override render(): TemplateResult {
    return html`<dl part="list"><slot></slot></dl>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-description-list': HelixHeadlessDescriptionList
  }
}
