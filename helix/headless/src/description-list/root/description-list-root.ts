import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
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

  protected override render(): TemplateResult {
    return html`<dl part="list"><slot></slot></dl>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-description-list': HelixHeadlessDescriptionList
  }
}
