import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary One row of a table.
 *
 * @description
 * The row renders its cells straight through and lays out none of them, so a
 * stylesheet can place them in the table's grid and every column lines up
 * across rows. The row still exists as an element, so you can style it, hide
 * it, or make it interactive.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, TableRow
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The row's cells.
 */
@customElement('helix-headless-table-row')
export class HelixHeadlessTableRow extends HelixElement {
  /**
   * @internal Read by the table to find its rows among its children, the way it
   * finds its columns. Not a consumer's to read or set.
   */
  readonly isTableRow = true

  /** The table's rules this row holds, so the next ones replace them rather than pile up. */
  private columnRules: CSSStyleSheet | undefined = undefined

  /**
   * @internal Takes the rules the table wrote to line each cell up under its
   * heading, called by that table. Not a consumer's to call: the rules are the
   * table's, and they say which column a cell is in by counting, which only the
   * table that holds the columns can do.
   */
  alignCells(rules: CSSStyleSheet): void {
    const root = this.renderRoot
    if (rules === this.columnRules || !(root instanceof ShadowRoot)) {
      return
    }
    root.adoptedStyleSheets = [
      ...root.adoptedStyleSheets.filter((sheet) => sheet !== this.columnRules),
      rules,
    ]
    this.columnRules = rules
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, and required: `display: contents` removes the row's box but
    // not the row from the table's structure. Without this the table has cells
    // and no rows, which is a broken table rather than a plain one.
    //
    // Set in `willUpdate`, which the server does call, unlike `connectedCallback`.
    hostAria(this.internals, { role: 'row' })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-row': HelixHeadlessTableRow
  }
}
