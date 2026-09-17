import { customElement, HelixElement, MixinCollection } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { edgeOf, type HelixHeadlessTableColumn } from '../column/table-column.js'
import type { HelixHeadlessTableRow } from '../row/table-row.js'

/**
 * The first `wanted` tracks of a track list, one entry each, so every declared
 * column can take the one in its place.
 *
 * Split on the spaces between tracks and never inside a function, so
 * `minmax(0, 1fr)` stays one track. A `repeat()` with a count is that many
 * tracks, written out; an automatic one names no count and yields none. Line
 * names go with the track after them.
 *
 * **A track the grid would refuse yields nothing either**, where the platform
 * can say. One invalid track makes the whole `grid-template-columns` invalid,
 * which a grid ignores in silence and draws as one column. That is the failure
 * that once had `columns` deprecated, a list of headings handed over as widths,
 * and dealt out a track at a time it costs the one column its width and no
 * more.
 */
const tracksOf = (list: string, wanted: number): string[] => {
  const words: string[] = []
  let depth = 0
  let word = ''
  for (const char of list.trim()) {
    if (char === '(' || char === '[') {
      depth += 1
    } else if (char === ')' || char === ']') {
      depth -= 1
    }
    if (depth === 0 && /\s/.test(char)) {
      if (word) {
        words.push(word)
      }
      word = ''
    } else {
      word += char
    }
  }
  if (word) {
    words.push(word)
  }
  const valid = (track: string): boolean =>
    typeof CSS === 'undefined' || CSS.supports('grid-template-columns', track)
  const tracks: string[] = []
  let names = ''
  for (const one of words) {
    if (tracks.length >= wanted) {
      break
    }
    if (one.startsWith('[')) {
      names += `${one} `
      continue
    }
    const repeat = /^repeat\(\s*(\d+)\s*,(.*)\)$/is.exec(one)
    if (repeat) {
      const inner = tracksOf(repeat[2] ?? '', wanted)
      for (let time = 0; time < Number(repeat[1]) && tracks.length < wanted; time += 1) {
        tracks.push(
          ...inner.map((track, index) => (time === 0 && index === 0 ? names + track : track)),
        )
      }
    } else if (!/^repeat\(/i.test(one)) {
      tracks.push(valid(names + one) ? names + one : '')
    }
    names = ''
  }
  return tracks.slice(0, wanted)
}

/**
 * @summary Tabular data laid out on a grid.
 *
 * @description
 * A grid rather than a `<table>`, so every column lines up across rows while
 * each row stays a real element that can be styled, hidden, or made
 * interactive. Table layout gives column alignment and takes away almost
 * everything else; grid gives both.
 *
 * The cost is that the roles have to be declared, since a grid of divs is not a
 * table to anyone reading it. `table`, `row`, `cell`, and `columnheader` are
 * all set explicitly, and rows are `display: contents` so their cells become
 * items of the one grid that does the aligning.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases DataTable, Grid table
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The table's rows.
 *
 * @csspart empty - Shown when there are no rows to show.
 * @csspart head - The row the column headings sit in. `display: contents`, so it takes no space.
 * @csspart loading - Shown while the rows are still on their way.
 * @csspart table - The grid.
 *
 * @cssproperty --table-template - The column track list this element worked out from the columns declared in it. Written by the component, read by the sheet that paints: a stylesheet takes it to lay the grid out, and setting it does nothing, because the component writes it inline on the very element that reads it and an inline declaration beats any sheet. `--table-columns` is the one to set.
 */
@customElement('helix-headless-table')
export class HelixHeadlessTable extends MixinCollection(HelixElement) {
  /**
   * The column widths as one track list, written once on the table.
   *
   * With `helix-table-column` children, each track sizes the column in its
   * place, a hidden column counted, so hiding one takes its track with it and
   * the rest keep theirs. The columns decide how many tracks there are and this
   * list only how wide: a track past the last column is dropped, and a column
   * past the last track shares what is left. With no columns declared it is
   * the whole track list. Tracks count as the grid counts them, so
   * `minmax(0, 1fr)` is one and `repeat(2, 8rem)` is two, and one the grid
   * would refuse leaves its column at the default rather than taking the table
   * down to one column.
   *
   * **A column's own `width` wins over its track here.** The width is written
   * on the column it sizes, which is the more particular statement, and it is
   * where a resize lands: a reader dragging a column's edge writes `width`, so
   * were this list to win, the drag would move the separator and leave the
   * track where the list put it. This is the table's default for its columns,
   * and each column may say otherwise.
   *
   * **It is also the only track list a server can send.** The shim has no tree
   * to walk, so a render there knows of no columns and this attribute is the
   * whole answer: a table given one lays its grid out in the first paint, and a
   * table sized only by its columns is one track wide until it upgrades.
   *
   * **`helix-data-table` has none of this, and should not.** Its columns are
   * its schema rather than an option, so there is always a column to write a
   * `width` on and a list here would be a second way to say what that says.
   * This table's cells are markup, and a table written as rows of cells with no
   * `helix-table-column` in it has nowhere else to be sized from. Both families
   * take the same CSS hook, `--table-columns` and `--data-table-columns`, which
   * wins over whichever list the element worked out.
   */
  @property()
  columns = ''

  /**
   * Accessible name for the table.
   */
  @property()
  label = ''

  /** The columns declared as children, in the order they are written. */
  get tableColumns(): HelixHeadlessTableColumn[] {
    /* Read during `render`, through `template`, so it answers what a render may
       know: nothing on a server, whose shim has no tree, and nothing while
       hydrating what one sent. */
    return this.knownChildren.filter(
      (child): child is HelixHeadlessTableColumn =>
        'isTableColumn' in child && child.isTableColumn === true,
    )
  }

  /**
   * The track list, from the columns if there are any.
   *
   * Read from the DOM rather than kept, so adding or removing a column needs
   * nothing else to be told. A hidden column takes no track: left in, the
   * header row had a heading fewer than the grid had tracks, the first cell
   * filled the gap, and every row after it began a column late. Falls back to
   * the `columns` string for a table that declares no columns, and to a single
   * track for one that declares neither.
   */
  private get template(): string {
    const declared = this.tableColumns
    if (declared.length === 0) {
      return this.columns
    }
    const listed = tracksOf(this.columns, declared.length)
    return declared
      .flatMap((column, index) =>
        column.shown ? [column.width ? column.track : listed[index] || column.track] : [],
      )
      .join(' ')
  }

  /* Columns arrive from the light DOM, which changes no property here, so
     nothing would schedule the render that reads them. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  /**
   * Watches the light DOM for rows and columns arriving, leaving and moving.
   *
   * **A manually assigned slot does not announce them**, the same gap `Chat`
   * and `Carousel` watch for. Under `slotAssignment: 'manual'` only `assign`
   * changes an assignment, so a row appended after the first render reached no
   * slot and drew nowhere, and a column moved to another place lost its
   * assignment on the way out and never got it back: measured in Chromium, both
   * `assignedSlot` null a render later. A table whose definition loaded before
   * its markup was parsed drew no columns at all, having rendered before any
   * arrived.
   */
  private watcher: MutationObserver | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.watcher = new MutationObserver(() => this.requestUpdate())
    this.watcher.observe(this, { childList: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  /**
   * Nothing is assigned by name, so the columns can be put in a row.
   *
   * The table pattern is `table > row > columnheader`, and a header cell
   * landing directly under `role="table"` with no owning row is invalid: it is
   * a cell belonging to nothing. The columns are ordinary children the consumer
   * writes with no `slot`, so the only way to put a wrapper around them without
   * changing what a consumer writes is to assign them here.
   *
   * Manual rather than a `slot` attribute this element would set on the
   * consumer's own markup, which is the change a React consumer's hydration
   * reports and does not patch up. Assignment writes nothing at all.
   *
   * Safe against the server because this repo ships no declarative shadow DOM:
   * the shadow root exists only after upgrade, and the assignment below runs in
   * that same update. There is no window in which the shadow is present and the
   * assignment has not happened.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /** The rows: every child that is not a column, which is what the body slot is assigned. */
  protected override get slotted(): Element[] {
    const columns = new Set<Element>(this.tableColumns)
    return [...(this.children ?? [])].filter((child) => !columns.has(child))
  }

  private assign(): void {
    /* Hydrating a server's root, which routes by name: the columns say where
       they go and the rows need nothing, the unnamed slot being theirs. */
    if (this.assignsByName) {
      for (const column of this.tableColumns) {
        this.route(column, 'columns')
      }
      return
    }
    const head = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="columns"]')
    const body = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    if (!head || !body) {
      return
    }
    head.assign(...this.tableColumns)
    body.assign(...this.slotted)
  }

  /**
   * The rules handing each column's `align` to the cells under it. One sheet for
   * every row this table holds, rewritten in place, so a column changing its
   * edge reaches every row in one write.
   */
  private alignment: CSSStyleSheet | undefined = undefined

  /** What `alignment` was last written with, so a render that changed no edge writes nothing. */
  private aligned = ''

  /**
   * Tells every row which edge each of its cells lines up against.
   *
   * **A rule in each row's shadow root, keyed on position and written by this
   * table.** The cells are the consumer's markup, so nothing may be written onto
   * them, and each of the other ways fails somewhere a table goes:
   *
   * - This element's own sheet cannot reach them. `::slotted()` matches what is
   *   assigned here, which is the rows, and never a row's children.
   * - A property per column published here, `--table-align-2: end`, still needs
   *   a rule that knows which column a cell is in, and a fixed ladder of
   *   `:nth-child` rules in a static sheet is a ceiling on the column count.
   * - A custom state set on each cell by script is right only until a cell
   *   moves, and a cell moving inside a row changes no child list this element
   *   watches.
   *
   * `:nth-child` is matched by the browser against wherever a cell is now, so a
   * cell that moves takes its new column's edge with no script at all; a column
   * that moves rewrites the rules on the render the watcher asks for; and a
   * column hidden along with its cells keeps its place in both counts, since
   * `:nth-child` counts a hidden sibling the way `tableColumns` counts a hidden
   * column. The row is where they go because only the shadow root holding a
   * slot can style what is assigned to it.
   *
   * **A custom property and nothing else**, which is how this tier publishes a
   * fact: the edge is the author's declaration, and what lining up means, a
   * `justify-content` or a `text-align`, belongs to whoever draws the cell.
   * `initial` on every cell first, so a table nested in an aligned cell does not
   * take the outer column's edge for columns of its own that set none.
   */
  private alignCells(): void {
    if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype)) {
      return
    }
    /* The attribute is a string anybody can write and this is a stylesheet, so
       only the three edges reach it. `edgeOf` is that guard, shared with
       `helix-data-table`, which puts the same attribute into the cells it
       draws. */
    const rules = this.tableColumns.flatMap((column, index) => {
      const edge = edgeOf(column.align)
      return edge ? [`::slotted(:nth-child(${index + 1})) { --table-cell-align: ${edge}; }`] : []
    })
    const text = ['::slotted(*) { --table-cell-align: initial; }', ...rules].join('\n')
    this.alignment ??= new CSSStyleSheet()
    if (text !== this.aligned) {
      this.alignment.replaceSync(text)
      this.aligned = text
    }
    for (const row of this.slotted) {
      if ('isTableRow' in row) {
        ;(row as HelixHeadlessTableRow).alignCells(this.alignment)
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
    this.alignCells()
  }

  protected override render(): TemplateResult {
    const template = this.template
    return html`<div
      part="table"
      role="table"
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label || 'Table'}
      style=${template ? `--table-template: ${template}` : ''}
    >
      <div part="head" role="row"><slot name="columns"></slot></div>
      <slot
        @slotchange=${(event: Event) => {
          this.countRows(event)
          this.handleSlotChange()
        }}
      ></slot>
      ${this.renderStatus(this.hasRows)}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table': HelixHeadlessTable
  }
}
