import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type ReactiveElement, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* `static-html`'s `html`, because the checkbox's tag is interpolated. */
import { html } from 'lit/static-html.js'
import '../../checkbox/index.js'

/**
 * @summary One row of a table.
 *
 * @description
 * The row renders its cells straight through and lays out none of them, so a
 * stylesheet can place them in the table's grid and every column lines up
 * across rows. The row still exists as an element, so you can style it, hide
 * it, or make it interactive.
 *
 * In a `selectable` table the row draws a checkbox cell before its own cells,
 * and `value` is the key the table's `selected` lists it by.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, TableRow
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The row's cells.
 *
 * @csspart checkbox - The row's checkbox, in a `selectable` table.
 * @csspart checkbox-box - The box drawn for the checkbox's input.
 * @csspart checkbox-control - The checkbox's input.
 * @csspart checkbox-feedback - Forwarded from the checkbox. Not shown in the table.
 * @csspart checkbox-field - The row that holds the checkbox's box.
 * @csspart checkbox-hint - Forwarded from the checkbox. Not shown in the table.
 * @csspart checkbox-label - Forwarded from the checkbox. The label is read by screen readers only.
 * @csspart checkbox-mark - The check mark.
 * @csspart checkbox-mark-checked - Added to `checkbox-mark` while its box is checked.
 * @csspart checkbox-mark-dash - Added to `checkbox-mark` while it draws the dash, which it keeps until its box is checked.
 * @csspart checkbox-mark-indeterminate - Added to `checkbox-mark` while only some rows are selected.
 * @csspart select - The cell that holds the row's checkbox, in a `selectable` table.
 * @csspart select-selected - Added to `select` while the row is selected.
 *
 * @cssstate selected - While the row is selected, in a `selectable` table.
 */
@customElement('helix-headless-table-row')
export class HelixHeadlessTableRow extends HelixElement {
  /**
   * @internal Read by the table to find its rows among its children, the way it
   * finds its columns. Not a consumer's to read or set.
   */
  readonly isTableRow = true

  /**
   * The key the table's `selected` lists this row by. Left empty, the row is
   * known by its place among the rows as written.
   */
  @property()
  value = ''

  /**
   * @internal Whether the table this row sits in is `selectable`, written by
   * that table. Not a consumer's to set: the selection is the table's.
   */
  @state()
  selectable = false

  /**
   * @internal Whether the row is selected, written by the table that owns the
   * selection. Not a consumer's to set: write the table's `selected`.
   */
  @state()
  selected = false

  /** @internal The name of the row's checkbox, written by the table. Not a consumer's to set. */
  @state()
  selectLabel = ''

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
    this.toggleState('selected', this.selectable && this.selected)
  }

  /**
   * Asks each cell to read its role again once the cells change.
   *
   * A `header` cell heads its row when a value sits beside it, and a cell that
   * upgrades while its row is still being parsed has no value beside it yet.
   */
  private readonly handleSlotChange = (): void => {
    for (const cell of this.children) {
      if ('isTableCell' in cell) {
        ;(cell as unknown as ReactiveElement).requestUpdate()
      }
    }
  }

  /**
   * The checkbox cell, in a `selectable` table.
   *
   * A cell of the row's own, before the consumer's cells, so the table's grid
   * gives it the first track. The table hears its `helix-before-toggle`,
   * refuses it and asks for the new selection, so the box shows only what the
   * table's `selected` says.
   */
  protected renderSelect(): TemplateResult | typeof nothing {
    if (!this.selectable) {
      return nothing
    }
    const checkbox = this.tag('checkbox')
    return html`<span part="select${this.selected ? ' select-selected' : ''}" role="cell"
      ><${checkbox}
        part="checkbox"
        exportparts="box: checkbox-box, control: checkbox-control, feedback: checkbox-feedback,
          field: checkbox-field, hint: checkbox-hint, label: checkbox-label, mark: checkbox-mark,
          mark-checked: checkbox-mark-checked, mark-dash: checkbox-mark-dash,
          mark-indeterminate: checkbox-mark-indeterminate"
        aria-label=${this.selectLabel}
        .checked=${this.selected}
      ></${checkbox}
    ></span>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderSelect()}<slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-row': HelixHeadlessTableRow
  }
}
