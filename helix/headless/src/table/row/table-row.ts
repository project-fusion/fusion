import {
  customElement,
  followLink,
  HelixElement,
  hostAria,
  internalsOf,
  MIRROR_RULE,
  pressedOwnControl,
} from '@fusion.dev/helix-core'
import { caretRight, dotsSixVertical } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type ReactiveElement, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
/* `static-html`'s `html`, because the checkbox's tag is interpolated. */
import { html } from 'lit/static-html.js'
import '../../checkbox/index.js'

/** Where a row stands in a move: the row being moved, or the one the drop indicator is beside. */
export type TableRowMove = 'dragging' | 'drop-after' | 'drop-before'

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
 * and `value` is the key the table's `selected` lists it by. `disabled` keeps
 * the row out of the selection and out of its link.
 *
 * In a `reorderable` table the row draws a grip cell before those, holding a
 * button named by the table's `move-row-label`, and `value` is the key
 * `helix-reorder` lists it by. The table says which row is moving and where
 * the drop indicator is, with the `dragging`, `drop-before`, and `drop-after`
 * states.
 *
 * **`parent` nests the row under another**, by that row's key. The table
 * then draws a column of disclosure buttons: a row with rows under it has one,
 * named by the table's `expand-row-label` and saying whether it is open with
 * `aria-expanded`, and its rows are drawn only while it is open. The cell is
 * indented by the row's depth through `--table-row-level`.
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
 * @csspart expand - The cell that holds the row's disclosure button, in a table whose rows nest. It carries `--table-row-level`, the row's depth from 1.
 * @csspart expand-button - The button that shows and hides the rows under this one.
 * @csspart expand-mark - The caret on the disclosure button, which points along the line, turned down by the styled tier while the row is open.
 * @csspart grip - The cell that holds the row's grip, in a `reorderable` table.
 * @csspart grip-button - The button that moves the row.
 * @csspart grip-mark - The icon on the grip.
 * @csspart select - The cell that holds the row's checkbox, in a `selectable` table.
 * @csspart select-selected - Added to `select` while the row is selected.
 *
 * @cssproperty --table-row-level - Written by the row on its `expand` cell: how deep the row sits, from 1. Do not set it.
 *
 * @cssstate dragging - The row is being moved, in a `reorderable` table.
 * @cssstate drop-after - The row being moved goes after this one when it is dropped.
 * @cssstate drop-before - The row being moved goes before this one when it is dropped.
 * @cssstate expanded - While the rows under this one are shown.
 * @cssstate link - While the row has `href` and is not `disabled`, so a press on it follows the link.
 * @cssstate selected - While the row is selected, in a `selectable` table.
 */
@customElement('helix-headless-table-row')
export class HelixHeadlessTableRow extends HelixElement {
  protected static override markRules = [MIRROR_RULE]

  /**
   * @internal Read by the table to find its rows among its children, the way it
   * finds its columns. Not a consumer's to read or set.
   */
  readonly isTableRow = true

  /**
   * Takes the row out of the table's selection and out of its link: the row's
   * checkbox is disabled, Space, Shift ranges, and the checkbox in the heading
   * pass over it, and a press does not follow `href`. A row already selected
   * stays selected. A screen reader hears it as unavailable, and in a `grid`
   * table the arrow keys still reach it, as a disabled cell in a grid is
   * reached.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * The URL a press on the row follows, which makes the whole row a link.
   * Empty, the default, leaves presses to the row's cells.
   */
  @property()
  href = ''

  /**
   * The key of the row this one sits under, in a table whose rows nest: that
   * row's `value`, or its place among the rows where it has none. Empty, the
   * default, is a row at the top.
   */
  @property()
  parent = ''

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
   * @internal The name of the row's grip, written by a `reorderable` table, and
   * empty in a table that does not reorder, which draws no grip. Not a
   * consumer's to set.
   */
  @state()
  gripLabel = ''

  /**
   * @internal Whether the grip does nothing for now, as while the table is
   * sorted, written by the table. Not a consumer's to set.
   */
  @state()
  gripStill = false

  /**
   * @internal Whether the grip cell holds the grid's one tab stop, written by
   * the table that sets `gridCell`. Not a consumer's to set.
   */
  @state()
  gripStop = false

  /**
   * @internal Where the row stands in a move, written by a `reorderable` table.
   * Not a consumer's to set.
   */
  @state()
  move: TableRowMove | undefined = undefined

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

  /**
   * @internal How deep the row sits, from 1, in a table whose rows nest, and
   * 0 in one whose rows do not, which draws no disclosure cell. Written by the
   * table. Not a consumer's to set.
   */
  @state()
  level = 0

  /**
   * @internal The row's place among the table's rows, the headings being 1,
   * in a `windowed` table, which draws only some of them, and 0 otherwise.
   * Written by the table. Not a consumer's to set.
   */
  @state()
  rowIndex = 0

  /** @internal Whether rows sit under this one. Written by the table. */
  @state()
  branch = false

  /** @internal Whether the rows under this one are shown. Written by the table. */
  @state()
  open = false

  /** @internal The name of the disclosure button. Written by the table. */
  @state()
  expandLabel = ''

  /** @internal Whether the disclosure cell holds the grid's one tab stop. Written by the table. */
  @state()
  expandStop = false

  /** @internal What a press on the disclosure button asks of the table. Written by the table. */
  @state()
  expandWith: (() => void) | undefined = undefined

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
    hostAria(internalsOf(this), { role: 'row' })
    this.nameByHeader()
    /* `aria-selected` in a grid only, where the row is what a reader moves
       through: in a plain table a row is not a thing that can be selected,
       and its checkbox already says so. */
    internalsOf(this).ariaSelected = this.gridCell && this.selectable ? String(this.selected) : null
    internalsOf(this).ariaDisabled = this.disabled ? 'true' : null
    internalsOf(this).ariaRowIndex = this.rowIndex > 0 ? String(this.rowIndex) : null
    /* A tree's depth and whether a branch is open, in a grid, which is then a
       `treegrid`. A plain table's disclosure button says it instead. */
    const tree = this.gridCell && this.level > 0
    internalsOf(this).ariaLevel = tree ? String(this.level) : null
    internalsOf(this).ariaExpanded = tree && this.branch ? String(this.open) : null
    this.toggleState('expanded', this.branch && this.open)
    this.toggleState('selected', this.selectable && this.selected)
    this.toggleState('link', this.href !== '' && !this.disabled)
    this.toggleState('dragging', this.move === 'dragging')
    this.toggleState('drop-after', this.move === 'drop-after')
    this.toggleState('drop-before', this.move === 'drop-before')
  }

  /**
   * Names the row by its header cell, the cell with `header` among cells of
   * values, or by its first cell where it has none, as React Aria's rows are
   * named.
   *
   * **Named from its contents, a row read out its checkbox's name too**, "Select
   * 412 412 main Passed" in a `selectable` table, since the checkbox is a cell of
   * the row's own. Not on a server, which has no cells to point at, and not
   * where a page named the row itself.
   */
  private nameByHeader(): void {
    const cells = this.childrenKnown
      ? this.knownChildren.filter(
          (child) => 'isTableCell' in child && !child.hasAttribute('hidden'),
        )
      : []
    const values = cells.some((cell) => !cell.hasAttribute('header'))
    const header =
      (values ? cells.find((cell) => cell.hasAttribute('header')) : undefined) ?? cells[0]
    const own = this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')
    if ('ariaLabelledByElements' in internalsOf(this)) {
      hostAria(internalsOf(this), { labelledBy: header && !own ? [header] : [] })
    } else {
      hostAria(internalsOf(this), {
        label: header && !own ? (header.textContent ?? '').replace(/\s+/g, ' ').trim() : '',
      })
    }
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
    if (this.disabled || this.href === '' || event.button !== 0 || event.defaultPrevented) {
      return
    }
    /* Asked inside the cell the press landed in, where it landed in one: a
       cell of the row's own is not a control of it, though a `grid` table
       gives every cell a `tabindex`. */
    const cell = event
      .composedPath()
      .find(
        (node) => node instanceof Element && node.parentElement === this && 'isTableCell' in node,
      )
    if (pressedOwnControl(event, cell ?? this)) {
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
    this.requestUpdate()
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
   * gives it the first track. The table hears its `helix-before-check`,
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
        ?disabled=${this.disabled}
        .checked=${this.selected}
      ></${checkbox}
    ></span>`
  }

  /**
   * The grip cell, in a `reorderable` table: a cell of the row's own before the
   * checkbox cell, holding the button that moves the row. In a grid the cell
   * takes focus and Space or Enter on it picks the row up, and the button
   * leaves the tab order. `aria-disabled` while a sort decides the order.
   */
  protected renderGrip(): TemplateResult | typeof nothing {
    if (!this.gripLabel) {
      return nothing
    }
    const grid = this.gridCell
    return html`<span
      part="grip"
      role=${grid ? 'gridcell' : 'cell'}
      tabindex=${grid ? (this.gripStop ? '0' : '-1') : nothing}
      ><button
        part="grip-button"
        type="button"
        tabindex=${grid ? '-1' : nothing}
        aria-label=${this.gripLabel}
        aria-disabled=${this.gripStill ? 'true' : nothing}
      ><svg aria-hidden="true" fill="currentColor" part="grip-mark" viewBox=${dotsSixVertical.viewBox}>${unsafeSVG(dotsSixVertical.content)}</svg></button
    ></span>`
  }

  /**
   * The disclosure cell, in a table whose rows nest: a button where rows sit
   * under this one, and an empty cell where none do, so the columns stay in
   * line. In a grid the cell takes focus and Space or Enter on it presses the
   * button, which leaves the tab order.
   */
  protected renderExpand(): TemplateResult | typeof nothing {
    if (this.level === 0) {
      return nothing
    }
    const grid = this.gridCell
    return html`<span
      part="expand"
      role=${grid ? 'gridcell' : 'cell'}
      style="--table-row-level: ${this.level}"
      tabindex=${grid ? (this.expandStop ? '0' : '-1') : nothing}
      >${
        this.branch
          ? html`<button
              part="expand-button"
              type="button"
              tabindex=${grid ? '-1' : nothing}
              aria-label=${this.expandLabel}
              aria-expanded=${this.open ? 'true' : 'false'}
              @click=${() => this.expandWith?.()}
            ><svg aria-hidden="true" data-mirror fill="currentColor" part="expand-mark" viewBox=${caretRight.viewBox}>${unsafeSVG(caretRight.content)}</svg></button>`
          : nothing
      }</span
    >`
  }

  protected override render(): TemplateResult {
    return html`${this.renderGrip()}${this.renderSelect()}${this.renderExpand()}<slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-row': HelixHeadlessTableRow
  }
}
