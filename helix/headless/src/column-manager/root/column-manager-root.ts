import {
  customElement,
  formatWords,
  type HelixBeforeCheckEvent,
  HelixElement,
  LayoutMotionController,
  words,
} from '@fusion.dev/helix-core'
import { dotsSixVertical, pushPin, pushPinSlash } from '@fusion.dev/helix-icons'
import { nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import {
  columnName,
  TableBinding,
  type ToolColumn,
  type ToolTable,
} from '../../data-table/binding.js'
import type { ViewColumns } from '../../data-table/view.js'
import '../../checkbox/index.js'

/** The next end a pin button moves a column to: none, the start, the end, then none again. */
const nextPin = (now: 'end' | 'start' | undefined): 'end' | 'start' | undefined =>
  now === undefined ? 'start' : now === 'start' ? 'end' : undefined

/**
 * @summary A list of a Data Table's columns, to show, hide, reorder, and pin them.
 *
 * @description
 * Set `for` to the id of a `DataTable`, and the list holds a row for each of
 * its columns with a `field`, in the order the table shows them.
 *
 * ```html
 * <helix-column-manager for="invoices"></helix-column-manager>
 * ```
 *
 * Each row has:
 *
 * - A checkbox that shows or hides the column. The last column showing cannot be hidden.
 * - A grip that moves the column. Drag it, or press Alt with Up or Down. While
 *   a row is dragged, a line marks the gap it will land in.
 * - A pin button that pins the column to the start of the row, then to the end, then unpins it.
 *   A pinned column stays in view while the table scrolls sideways.
 * - A note that says "Pinned", or "Hidden at this width" for a column the table leaves out
 *   because it is narrower than the column's `min-table-width`.
 *
 * Reset puts the columns back as they were when the list first read the
 * table.
 *
 * **It writes the table's `view.columns` and nothing else.** Every change asks
 * the table with `requestView`, so the table fires `helix-before-view-change`,
 * which you can refuse, and `helix-view-change`.
 *
 * **Keyboard.** Each row's checkbox, grip and pin button are in the tab order.
 *
 * | Key | What it does |
 * |---|---|
 * | Space on a checkbox | Shows or hides the column. |
 * | Alt with Up or Down | Moves the column one place, from anywhere in its row. |
 * | Enter, Space on a pin button | Pins the column to the start, then to the end, then unpins it. |
 *
 * A move is said in the `live` region.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Column picker, Column chooser
 * @use Which of a Data Table's columns show, in what order, and which stay pinned.
 * @instead view-panel - A table's whole view on a phone, with the columns as one section.
 * @instead quick-filters - A saved view of a table that you switch to in one press.
 * @anatomy header
 * @anatomy item
 * @anatomy grip
 * @anatomy checkbox
 * @anatomy pin
 * @practice Put Column Manager in a Popover opened by a Columns button, or in a Drawer on a phone. - The list is the panel's content, and it draws no trigger of its own.
 * @practice Store the table's view to keep a reader's columns. - Every change goes to the table's view, and the list keeps nothing of its own.
 * @documentation https://fusion.dev/design/components/column-manager
 *
 * @csspart checkbox - The `Checkbox` that shows or hides a column.
 * @csspart checkbox-box - The box drawn for a row's checkbox.
 * @csspart checkbox-control - The native input inside a row's checkbox.
 * @csspart checkbox-feedback - Forwarded from the checkbox. Not shown, since a column's box is never wrong.
 * @csspart checkbox-field - The row inside a checkbox that holds its box and the column's name.
 * @csspart checkbox-hint - Forwarded from the checkbox. Not shown, since a column's box has no help.
 * @csspart checkbox-label - The label beside a row's box, which holds `name`.
 * @csspart checkbox-mark - The check mark on a row's box.
 * @csspart checkbox-mark-checked - Added to `checkbox-mark` while the column shows.
 * @csspart checkbox-mark-dash - Forwarded from the checkbox. Not shown, since a column is shown or hidden.
 * @csspart checkbox-mark-indeterminate - Forwarded from the checkbox. Not shown, since a column is shown or hidden.
 * @csspart drop - The line that marks where a dragged row will land. It carries `data-at` while it marks a gap, and that gap's place down the element as `--_column-manager-drop-y`. Hidden until a stylesheet shows it, so the headless tier lays out as it did without it.
 * @csspart grip - The button that moves a column.
 * @csspart grip-mark - The icon on the grip.
 * @csspart header - The row above the list that holds the title and the reset button.
 * @csspart item - One column's row.
 * @csspart item-dragging - Added to `item` while it is being dragged.
 * @csspart item-hidden - Added to `item` while its column is hidden.
 * @csspart list - The list of columns.
 * @csspart live - The region that says a move. Visually hidden in the styled tier.
 * @csspart name - A column's name, which labels its checkbox.
 * @csspart note - Says "Pinned" or "Hidden at this width" beside a column's name.
 * @csspart pin - The button that pins a column.
 * @csspart pin-mark - The icon on the pin button.
 * @csspart pin-pinned - Added to `pin` while its column is pinned.
 * @csspart reset - The button that puts the columns back.
 * @csspart title - The list's heading.
 */
@customElement('helix-headless-column-manager')
export class HelixHeadlessColumnManager extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-column-manager': { resetLabel: 'Zurücksetzen' } })`.
   */
  static words = 'helix-column-manager'

  /** The note on a column the table leaves out at its width. */
  @words
  @property({ attribute: 'dropped-label' })
  droppedLabel = 'Hidden at this width'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Columns'

  /**
   * The id of the `DataTable` whose columns the list holds, in the same
   * document or shadow root.
   */
  @property()
  for = ''

  /**
   * The name of the list, which a screen reader announces before its items.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * What a screen reader hears after a move. `{name}` is the column's heading,
   * `{position}` its place and `{count}` the number of columns.
   */
  @words
  @property({ attribute: 'moved-label' })
  movedLabel = '{name} moved to {position} of {count}'

  /** The name of a column's grip. `{name}` is the column's heading. */
  @words
  @property({ attribute: 'move-label' })
  moveLabel = 'Move {name}'

  /** The name of the pin button on a column pinned to the start. `{name}` is its heading. */
  @words
  @property({ attribute: 'pin-end-label' })
  pinEndLabel = 'Pin {name} to the end'

  /** The note on a pinned column. */
  @words
  @property({ attribute: 'pinned-label' })
  pinnedLabel = 'Pinned'

  /** The name of the pin button on a column that is not pinned. `{name}` is its heading. */
  @words
  @property({ attribute: 'pin-start-label' })
  pinStartLabel = 'Pin {name} to the start'

  /** The words on the button that puts the columns back. */
  @words
  @property({ attribute: 'reset-label' })
  resetLabel = 'Reset'

  /** The name of the pin button on a column pinned to the end. `{name}` is its heading. */
  @words
  @property({ attribute: 'unpin-label' })
  unpinLabel = 'Unpin {name}'

  /** What the live region says. */
  @state()
  private said = ''

  /** The field being dragged, while a pointer drags one. */
  @state()
  private dragging: string | undefined = undefined

  /**
   * The gap a dragged row would land in, as its place among the rows, `0`
   * before the first, and how far down the list the middle of that gap is.
   * Absent where dropping would move nothing.
   */
  @state()
  private dropGap: { at: number; y: number } | undefined = undefined

  /** The columns as the list first read them, which Reset puts back. */
  private first: ViewColumns | undefined = undefined

  protected readonly binding = new TableBinding(this)

  /**
   * Sliding each column's row to its new place as the order changes, by a
   * drop, by Alt with an arrow, by a pin, or by Reset, so the reader sees
   * where a column went rather than the list redrawn in a new order. Timed by
   * `--column-manager-move-duration` and `--column-manager-move-easing`,
   * which this tier never sets, so it moves nothing until a stylesheet does.
   */
  protected readonly motion = new LayoutMotionController(this, {
    items: () => [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part~="item"]') ?? [])],
    timing: () => {
      const style = getComputedStyle(this)
      return {
        duration: style.getPropertyValue('--column-manager-move-duration'),
        easing: style.getPropertyValue('--column-manager-move-easing'),
      }
    },
    watch: 'updates',
  })

  /** The bound table, once it is in the tree. */
  get table(): ToolTable | null {
    return this.binding.table
  }

  /** The columns with a field, in the order the table shows them. */
  private columns(table: ToolTable): ToolColumn[] {
    const columns = table.tableColumns.filter((column) => column.field !== '')
    const order = table.view.columns.order
    if (order.length === 0) {
      return columns
    }
    const rank = new Map(order.map((field, place) => [field, place]))
    return [...columns].sort(
      (a, b) =>
        (rank.get(a.field) ?? Number.POSITIVE_INFINITY) -
        (rank.get(b.field) ?? Number.POSITIVE_INFINITY),
    )
  }

  /** Asks the table for its columns arranged another way. */
  private ask(table: ToolTable, columns: Partial<ViewColumns>): boolean {
    return table.requestView({ columns })
  }

  /** Shows or hides one column. */
  toggleColumn(field: string, shown: boolean): boolean {
    const table = this.table
    if (!table) {
      return false
    }
    const hidden = table.view.columns.hidden.filter((one) => one !== field)
    return this.ask(table, { hidden: shown ? hidden : [...hidden, field] })
  }

  /** Moves one column by some places among the columns, and says where it went. */
  moveColumn(field: string, by: number): boolean {
    const table = this.table
    if (!table) {
      return false
    }
    const columns = this.columns(table)
    const fields = columns.map((column) => column.field)
    const from = fields.indexOf(field)
    const to = Math.max(0, Math.min(fields.length - 1, from + by))
    if (from < 0 || to === from) {
      return false
    }
    fields.splice(to, 0, ...fields.splice(from, 1))
    if (!this.ask(table, { order: fields })) {
      return false
    }
    const column = columns[from] as ToolColumn
    this.said = formatWords(this, 'movedLabel', {
      count: fields.length,
      name: columnName(column),
      position: to + 1,
    })
    return true
  }

  /** Pins a column to an end of the row, or unpins it with `undefined`. */
  pinColumn(field: string, edge: 'end' | 'start' | undefined): boolean {
    const table = this.table
    if (!table) {
      return false
    }
    const pinned = { ...table.view.columns.pinned }
    if (edge) {
      pinned[field] = edge
    } else {
      delete pinned[field]
    }
    return this.ask(table, { pinned })
  }

  /** Puts the columns back as they were when the list first read the table. */
  reset(): boolean {
    const table = this.table
    const first = this.first
    return table && first ? this.ask(table, first) : false
  }

  protected override willUpdate(): void {
    const table = this.table
    if (table && !this.first) {
      const { columns } = table.view
      this.first = {
        hidden: [...columns.hidden],
        order: [...columns.order],
        pinned: { ...columns.pinned },
        widths: { ...columns.widths },
      }
    }
  }

  private readonly handleKey = (event: KeyboardEvent, field: string): void => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
      return
    }
    event.preventDefault()
    if (this.moveColumn(field, event.key === 'ArrowUp' ? -1 : 1)) {
      /* The row moved under the reader, so focus follows it to its new place. */
      const at = (event.target as HTMLElement).getAttribute('part')?.split(' ')[0]
      this.updateComplete.then(() => {
        this.renderRoot
          .querySelector<HTMLElement>(
            `[data-field="${CSS.escape(field)}"] [part~="${at ?? 'grip'}"]`,
          )
          ?.focus()
      })
    }
  }

  private readonly handleDragStart = (event: DragEvent, field: string): void => {
    this.dragging = field
    event.dataTransfer?.setData('text/plain', field)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  /**
   * **The gap under the pointer**: before the row it is over in that row's
   * upper half, after it in the lower half. Measured from the element's top,
   * which the line is placed against, beside the list so the list holds only
   * the columns.
   */
  private readonly handleDragOver = (event: DragEvent, field: string): void => {
    const table = this.table
    if (this.dragging === undefined || !table) {
      return
    }
    event.preventDefault()
    const row = event.currentTarget as HTMLElement
    const list = this.partNamed('list')
    const box = row.getBoundingClientRect()
    const after = event.clientY > box.top + box.height / 2
    const fields = this.columns(table).map((column) => column.field)
    const at = fields.indexOf(field) + (after ? 1 : 0)
    const from = fields.indexOf(this.dragging)
    if (at === from || at === from + 1 || !list) {
      this.dropGap = undefined
      return
    }
    /* The middle of the gap: half the list's gap past the row's edge. */
    const half = (Number.parseFloat(getComputedStyle(list).rowGap) || 0) / 2
    const y = (after ? box.bottom + half : box.top - half) - this.getBoundingClientRect().top
    if (this.dropGap?.at !== at || this.dropGap.y !== y) {
      this.dropGap = { at, y }
    }
  }

  /** Over the list between two rows, the line holds where it was. */
  private readonly handleListOver = (event: DragEvent): void => {
    if (this.dragging !== undefined) {
      event.preventDefault()
    }
  }

  /** Out of the list, the line goes, and a drop there moves nothing. */
  private readonly handleListLeave = (event: DragEvent): void => {
    const list = event.currentTarget as HTMLElement
    if (!list.contains(event.relatedTarget as Node | null)) {
      this.dropGap = undefined
    }
  }

  /** Moves the dragged row into the gap the line marks. */
  private readonly handleDrop = (event: DragEvent): void => {
    const table = this.table
    const moving = this.dragging
    const gap = this.dropGap
    this.dragging = undefined
    this.dropGap = undefined
    if (!table || moving === undefined || gap === undefined) {
      return
    }
    event.preventDefault()
    const fields = this.columns(table).map((column) => column.field)
    const from = fields.indexOf(moving)
    const to = gap.at > from ? gap.at - 1 : gap.at
    this.moveColumn(moving, to - from)
  }

  private readonly handleDragEnd = (): void => {
    this.dragging = undefined
    this.dropGap = undefined
  }

  protected renderItem(table: ToolTable, column: ToolColumn, onlyShown: boolean): TemplateResult {
    const { field } = column
    const name = columnName(column)
    const shown = !table.view.columns.hidden.includes(field)
    const pin = table.view.columns.pinned[field]
    const dropped = shown && table.droppedFields.includes(field)
    const note = pin ? this.pinnedLabel : dropped ? this.droppedLabel : ''
    const pinName = pin === 'start' ? 'pinEndLabel' : pin === 'end' ? 'unpinLabel' : 'pinStartLabel'
    const icon = pin === 'end' ? pushPinSlash : pushPin
    const checkbox = this.tag('checkbox')
    return html`<li
      part="item${this.dragging === field ? ' item-dragging' : ''}${shown ? '' : ' item-hidden'}"
      data-field=${field}
      draggable="true"
      @dragstart=${(event: DragEvent) => this.handleDragStart(event, field)}
      @dragend=${this.handleDragEnd}
      @dragover=${(event: DragEvent) => this.handleDragOver(event, field)}
      @keydown=${(event: KeyboardEvent) => this.handleKey(event, field)}
    >
      <button part="grip" type="button" aria-label=${formatWords(this, 'moveLabel', { name })}
        ><svg aria-hidden="true" fill="currentColor" part="grip-mark" viewBox=${dotsSixVertical.viewBox}>${unsafeSVG(dotsSixVertical.content)}</svg></button
      ><${checkbox}
        part="checkbox"
        exportparts="box: checkbox-box, control: checkbox-control, feedback: checkbox-feedback,
          field: checkbox-field, hint: checkbox-hint, label: checkbox-label, mark: checkbox-mark,
          mark-checked: checkbox-mark-checked, mark-dash: checkbox-mark-dash,
          mark-indeterminate: checkbox-mark-indeterminate"
        .checked=${shown}
        ?disabled=${shown && onlyShown}
        @helix-before-check=${(event: HelixBeforeCheckEvent) => {
          // The table's view decides, and the box follows it on the next render.
          event.preventDefault()
          this.toggleColumn(field, event.detail.checked)
        }}
        ><span part="name">${name}</span></${checkbox}
      >${note ? html`<span part="note">${note}</span>` : nothing}<button
        part="pin${pin ? ' pin-pinned' : ''}"
        type="button"
        aria-label=${formatWords(this, pinName, { name })}
        aria-pressed=${pin ? 'true' : 'false'}
        @click=${() => this.pinColumn(field, nextPin(pin))}
      ><svg aria-hidden="true" fill="currentColor" part="pin-mark" viewBox=${icon.viewBox}>${unsafeSVG(icon.content)}</svg></button>
    </li>`
  }

  protected override render(): TemplateResult {
    const table = this.table
    const columns = table ? this.columns(table) : []
    const shownCount = table
      ? columns.filter((column) => !table.view.columns.hidden.includes(column.field)).length
      : 0
    return html`<div part="header">
        <span part="title" id="title">${this.label || this.fallbackLabel}</span>
        <button part="reset" type="button" @click=${() => this.reset()}>${this.resetLabel}</button>
      </div>
      <ul
        part="list"
        aria-labelledby="title"
        @dragover=${this.handleListOver}
        @dragleave=${this.handleListLeave}
        @drop=${this.handleDrop}
      >
        ${
          table
            ? repeat(
                columns,
                (column) => column.field,
                (column) => this.renderItem(table, column, shownCount <= 1),
              )
            : nothing
        }
      </ul>
      <span
        part="drop"
        aria-hidden="true"
        hidden
        data-at=${this.dropGap?.at ?? nothing}
        style=${this.dropGap ? `--_column-manager-drop-y: ${this.dropGap.y}px` : nothing}
      ></span>
      <span part="live" aria-live="polite">${this.said}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-column-manager': HelixHeadlessColumnManager
  }
}
