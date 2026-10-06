import { customElement, followLink, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type ReactiveElement, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* `static-html`'s `html`, because the checkbox's tag is interpolated. */
import { html } from 'lit/static-html.js'
import '../../checkbox/index.js'

/** What inside a row takes a press of its own, so the row's link does not. */
const PRESSABLE = 'a[href], button, input, label, select, summary, textarea, [tabindex]'

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
 * **`href` makes the whole row a link**, as a row action does in React Aria's
 * table: a press anywhere on the row follows it, except on a link or a control
 * of the row's own, and Control, Command or Shift open it the way they open a
 * link. A drag that selects text follows nothing. A row in a table is not a
 * stop of its own, so put the same link in a cell, usually the row header,
 * which is what the keyboard and a screen reader reach. In a `grid` table,
 * Enter on any cell of the row follows it as well.
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
 * @cssstate link - While the row has `href`, so a press on it follows the link.
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
   * The URL a press on the row follows, which makes the whole row a link.
   * Empty, the default, leaves presses to the row's cells.
   */
  @property()
  href = ''

  /** The `rel` of the row's link. You set it yourself, as on an anchor. */
  @property()
  rel = ''

  /** Where the row's link opens, such as `_blank`. */
  @property()
  target = ''

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

  /**
   * @internal Whether the row is a row of a `grid` table, written by that
   * table. Not a consumer's to set. The checkbox cell is then a `gridcell`
   * that takes focus, and the row says whether it is selected.
   */
  @state()
  gridCell = false

  /**
   * @internal Whether the checkbox cell holds the grid's one tab stop, written
   * by the table that sets `gridCell`. Not a consumer's to set.
   */
  @state()
  selectStop = false

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
    /* `aria-selected` in a grid only, where the row is what a reader moves
       through: in a plain table a row is not a thing that can be selected,
       and its checkbox already says so. */
    this.internals.ariaSelected = this.gridCell && this.selectable ? String(this.selected) : null
    this.toggleState('selected', this.selectable && this.selected)
    this.toggleState('link', this.href !== '')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.handleClick)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleClick)
  }

  /**
   * A press on the row follows `href`, unless it landed on a link or control
   * of the row's own, or ended a drag that selected text.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (this.href === '' || event.button !== 0 || event.defaultPrevented) {
      return
    }
    const path = event.composedPath()
    const inner = path.slice(0, Math.max(0, path.indexOf(this)))
    /* A cell of the row's own is not a control of it, though a `grid` table
       gives every cell a `tabindex`. */
    const own = (node: EventTarget): boolean =>
      node instanceof Element && node.parentElement === this && 'isTableCell' in node
    if (inner.some((node) => node instanceof Element && node.matches(PRESSABLE) && !own(node))) {
      return
    }
    if (globalThis.getSelection?.()?.toString()) {
      return
    }
    followLink(this.ownerDocument, { href: this.href, rel: this.rel, target: this.target }, event)
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
    const grid = this.gridCell
    /* In a grid the cell takes focus and the checkbox leaves the tab order,
       which has one stop: Space on the cell ticks it. */
    return html`<span
      part="select${this.selected ? ' select-selected' : ''}"
      role=${grid ? 'gridcell' : 'cell'}
      tabindex=${grid ? (this.selectStop ? '0' : '-1') : nothing}
      ><${checkbox}
        tabindex=${grid ? '-1' : nothing}
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
