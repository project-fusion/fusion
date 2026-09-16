import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Labels and their values, read as pairs: the details panel every
 * product has.
 *
 * @description
 * "Owner: Ada, Region: us-east, Created: 3 days ago" is the commonest panel in
 * any console, and built from layout primitives it is a run of adjacent text:
 * nothing tells a screen reader that a label and a value belong together, or
 * how many pairs there are. This renders the element the platform has for it,
 * a `<dl>`, with each item's label a `<dt>` and its value a `<dd>`.
 *
 * **The items render their own term and description**, and the list takes them
 * through its slot. The accessibility tree is built from the flattened tree, so
 * the pairs reach it inside the list rather than beside it. Measured in
 * Chromium's tree rather than assumed, because a list whose semantics stopped
 * at a shadow boundary would look identical on screen: one description list
 * holding term and definition pairs, node for node what a plain `<dl>` with the
 * same content produces, with a slotted label and with an item drawn as
 * `display: contents` alike.
 *
 * @since 0.1.0
 * @status experimental
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
