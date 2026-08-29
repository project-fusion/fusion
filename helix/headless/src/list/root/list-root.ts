import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A set of rows, read as a set.
 *
 * @description
 * `role="list"` on the host, so the rows are counted and announced as "1 of 7"
 * rather than as seven unrelated passages. That count is the whole reason to
 * use a list rather than a stack of divs.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Rows, Stack, Menu
 * @documentation https://helix.fusion.dev/components/list
 *
 * @slot - The rows.
 */
@customElement('helix-headless-list')
export class HelixHeadlessList extends HelixElement {
  /**
   * What kind of list this is, which is a fact about the content.
   *
   * On the headless tier because it is meaning rather than decoration, the same
   * argument `severity` makes on `Callout`. A numbered list is numbered because
   * the order carries information; a bulleted one is bulleted because the items
   * are a set and the order does not. That distinction is the reader's, and it
   * has to survive with the stylesheet turned off.
   *
   * - `default` is a run of rows and takes no marker. It is what a list of
   *   settings or files is: neither ordered nor a set to be counted.
   * - `ordered` numbers them, for steps.
   * - `unordered` bullets them, for a set.
   * - `description` pairs each row's label with its supporting text as a term
   *   and what the term means.
   *
   * **`description` reuses the row's existing slots rather than inventing a
   *   second kind of row.** A term and its description is exactly the label and
   *   the supporting text `List.Item` already has, so the kind changes how the
   *   pair is drawn and nothing about what a consumer writes. A separate
   *   `List.Term` element would be a second row shape for one attribute's sake.
   */
  @property({ reflect: true })
  kind?: 'default' | 'description' | 'ordered' | 'unordered'

  /**
   * Accessible name for the set.
   */
  @property()
  label = ''

  /**
   * Which markers an ordered list draws, in `<ol type>`'s own five values.
   *
   * Reflected, because this is one of the things a stylesheet selects on and
   * the styled tier maps each to a `list-style-type`. The platform's spellings
   * rather than the CSS ones, so `<helix-list kind="ordered" type="i">` is what
   * a consumer would have written on an `<ol>`.
   *
   * **`start` and `reversed` are both absent and neither can be done here.**
   * This renders no `<ol>`: the rows are slotted and numbered by the CSS
   * `list-item` counter, and that counter is not author-resettable. Measured in
   * Chrome 148, `counter-reset: list-item 4` moves nothing on a `<div>`, on a
   * `<ul>`, or even on a real `<ol>`, while `<ol start="5">` does and a *named*
   * counter with explicit `::before` content does. So the markers would have to
   * be rebuilt out of generated content to gain a start, which is a different
   * component. `type` is only `list-style-type` and works.
   */
  @property({ reflect: true })
  type?: '1' | 'a' | 'A' | 'i' | 'I'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'list' })
    /* `role="list"` at every kind, including `description`. A description list
       has its own native role, but this renders divs rather than `<dl>`, and
       claiming `term`/`definition` without the owning `list` those roles
       require is worse than a plain list: an invented role that resolves to
       nothing tells a reader less than an honest generic one. The pairing is
       carried by the markup being a label and its supporting text, which is
       what it already was. */
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-list': HelixHeadlessList
  }
}
