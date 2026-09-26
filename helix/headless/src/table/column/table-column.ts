import {
  customElement,
  fillTemplate,
  HelixBeforeResizeEvent,
  HelixElement,
  hostAria,
  inlineStep,
  isRtl,
  requestChange,
} from '@fusion.dev/helix-core'
import { dotsThreeVertical } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type ReactiveElement, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * How a column is read out of a row, once the row is data rather than markup.
 *
 * A function rather than a template, because a `<template>` holding one is what
 * a build step produces and a hand-authored page cannot: the type is the escape
 * hatch and `field` is the path that needs no build. Returning anything Lit can
 * render means a cell can hold a badge, a link or a number, and returning
 * `undefined` falls back to the field.
 */
export type CellReader = (row: Readonly<Record<string, unknown>>) => unknown

/**
 * A dot path resolved against a row.
 *
 * Written here rather than taken from a library, because the whole of what is
 * needed is "walk the keys and stop at the first thing that is not an object".
 * Returns `undefined` for a path that does not resolve, which the table renders
 * as an empty cell: a missing key is a hole in the data and drawing `undefined`
 * into a table tells a reader the software is broken rather than the row is.
 */
export const at = (row: Readonly<Record<string, unknown>>, path: string): unknown => {
  if (path === '') {
    return undefined
  }
  if (!path.includes('.')) {
    return row[path]
  }
  let cursor: unknown = row
  for (const key of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') {
      return undefined
    }
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return cursor
}

/** The edges a column's `text-align` may name. */
const EDGES = new Set(['center', 'end', 'start'])

/**
 * The edge a column names, where it names one of the three.
 *
 * **`text-align` is a string anybody can write**, the union on the property being a
 * compile-time claim and nothing else, and both tables put the value straight
 * into CSS: `Table` into a rule in each row's shadow root, `DataTable` into the
 * cell it draws. One guard, here with the property, rather than one in each
 * table and only one of them written.
 */
export const edgeOf = (align: string | undefined): string | undefined =>
  align && EDGES.has(align) ? align : undefined

/**
 * @summary One column of a table: its heading, its width, and the field it reads from each row.
 *
 * @description
 * **The column is the source of both its heading and its track.** Add one and
 * the table has another track; remove one and it does not. That is what ties
 * the two together, and a table-level track list on its own does not: a list
 * that is accidentally the headings is invalid CSS a grid ignores in silence,
 * drawing the whole table as one column. `Table`'s `columns` is dealt out a
 * track at a time against the columns declared under it, so a heading among the
 * widths costs its own column a width and no more, and a list longer or shorter
 * than the columns is trimmed or shared rather than being a second count of
 * them. A column's own `width` wins over the track in its place.
 *
 * **It is also where every per-column fact goes**, which is the reason
 * `DataTable` needs no column config object. `field` names the key the cell
 * reads, `sortable` says a reader may reorder by it, `text-align` says which edge
 * the values line up against, and `cell` takes a function for anything the
 * field alone cannot express. The schema is markup and the data is a property:
 * a schema is small, declarative, and something a reader should be able to see
 * in the HTML, and data is large and windowed.
 *
 * **The same element serves both tables**, the markup one and the data one. It
 * is identified by a flag rather than by `instanceof`, so a `TableColumn` works
 * inside either without the two roots sharing anything else.
 *
 * **It generates no box of its own**, the same as a row: the heading is a grid
 * item of the table, so it lines up with the cells under it rather than sitting
 * in a wrapper that has to be kept the same width.
 *
 * **`hidden` takes the column out of the grid**, its heading and its track
 * both, so the columns after it keep their own widths and every row keeps its
 * cells under their headings. `hidden="until-found"` keeps its track, the
 * heading being left drawn, as every Helix element leaves one with that value.
 * `DataTable` draws the cells, so it leaves out the ones under a hidden column.
 * A `Table`'s cells are markup the consumer wrote, so hide them with the
 * column, as removing a column means removing its cells: a row with a cell more
 * than the table has tracks wraps into the next.
 *
 * **A heading that does something holds a control that does it.** The host is
 * the column header, and a header is not focusable, so a sortable heading is a
 * `<button>` inside it: the pattern for a sortable table, and the only way a
 * reader on a keyboard reaches the sort at all. A column a reader may resize
 * carries a `separator` on its end edge, moved by dragging it or with the arrow
 * keys, and a column in a table that lets a reader reorder its columns carries
 * a grip the table moves.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Column header, Th
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The heading.
 *
 * @event {HelixBeforeResizeEvent} helix-before-resize - The column is about to be resized, with the requested width. Cancelable: cancel it to keep the current width.
 *
 * @csspart column - The heading cell.
 * @csspart grip - The handle for moving the column, when the table allows it.
 * @csspart grip-mark - The icon on the grip.
 * @csspart resizer - The edge that is dragged to change the width, when the column is resizable.
 * @csspart sort - The button that a sortable heading renders as.
 *
 * @cssstate sorted-ascending - While the table is sorted by this column, smallest first.
 * @cssstate sorted-descending - While the table is sorted by this column, largest first.
 */
@customElement('helix-headless-table-column')
export class HelixHeadlessTableColumn extends HelixElement {
  /**
   * A function that reads the cell's content from a row, for cells that `field`
   * alone cannot read.
   *
   * A property and not an attribute, because it is a function. Set it from a Lit
   * template with `.cell=${...}`, or assign it in script. A column with neither
   * this nor a `field` renders an empty cell rather than the whole row stringified,
   * which is the failure mode of guessing.
   */
  @property({ attribute: false })
  cell: CellReader | undefined = undefined

  /**
   * A function that reads the value used for sorting and filtering, when it
   * differs from the cell.
   *
   * **The one that is easy to leave out and expensive to add later.** A cell
   * showing `2.4 MB` sorts as a string unless something says the underlying value
   * is a number, so `12 kB` sorts above `2.4 MB` and the column looks broken
   * while every value in it is right. Left unset this is the field, which is the
   * correct default: the raw value is what an API sorted by.
   */
  @property({ attribute: false })
  compare: CellReader | undefined = undefined

  /**
   * The key this column reads out of a row.
   *
   * Dot paths resolve, so `field="owner.name"` reads a nested value: a result
   * from an API arrives shaped the way the API shaped it, and requiring a flat
   * row would push a mapping pass onto every consumer.
   *
   * **It is also the sort and filter identity**, which is why sorting is by
   * field and not by column index: a reordered or hidden column would otherwise
   * change what `sort="2:asc"` means, and a sort that means something different
   * after a column moves is a sort a consumer cannot store in a URL.
   *
   * Empty on a column that is purely presentational, an actions column say, and
   * such a column is never sortable however it is marked.
   */
  @property()
  field = ''

  /**
   * The accessible name of the grip that moves the column. `{name}` is replaced
   * with the heading text.
   *
   * **Every word a column speaks is a property**, so a table in another
   * language hears its own rather than English around its own headings.
   */
  @property({ attribute: 'move-label' })
  moveLabel = 'Move {name}'

  /**
   * Whether the column can be resized.
   *
   * By dragging the edge at the end of the heading, or with the arrow keys once
   * it has focus, a step at a time and four with Shift. The width lands in
   * `width` as pixels, and `helix-before-resize` asks first, so a consumer who
   * stores the widths can take the decision.
   */
  @property({ type: Boolean })
  resizable = false

  /**
   * The accessible name of the separator that resizes the column. `{name}` is
   * replaced with the heading text.
   */
  @property({ attribute: 'resize-label' })
  resizeLabel = 'Resize {name}'

  /**
   * Whether the table can be sorted by this column.
   *
   * Ignored without a `field`, and silently: a column with nothing to sort by
   * has no order to offer, and refusing loudly would mean an actions column
   * carrying `sortable` breaks a table rather than doing nothing.
   *
   * **Reflected, because a stylesheet selects on it.** `@fusion.dev/helix`
   * gives a data table's sortable headings a pointer through
   * `::slotted(helix-table-column[sortable])`, and set as a property, which is
   * how React sets it, an unreflected `sortable` left no attribute to match.
   * `false` reflects as no attribute at all, so an unset column writes nothing
   * onto its host.
   */
  @property({ reflect: true, type: Boolean })
  sortable = false

  /**
   * Which edge the values line up against.
   *
   * **Text alignment, and the name says so.** `Flex` and `Grid` ask the CSS
   * box-alignment question, where a thing sits in a container, and they are
   * named for the properties they mirror; this is `text-align` down a column of
   * values, and `Dialog` answers the same question under the same name. One
   * word for both questions is how a consumer who learned it on a layout writes
   * it here and gets no error, a value a component does not have leaving the
   * default in place and looking deliberate.
   *
   * `end` is what a column of numbers wants, so digits of the same magnitude
   * sit above each other. Left unset the cell inherits the table's own
   * alignment, which is `start` for text in either writing direction.
   * `DataTable` aligns the cells it draws. A `Table`'s cells are markup the
   * consumer wrote, so the table writes nothing onto them: it publishes the
   * edge to each cell under this column as `--table-cell-align`, which
   * `@fusion.dev/helix` reads. The heading is this element's own, and
   * `@fusion.dev/helix` sets it to the same edge in either table. `end` is the
   * inline end, so in a right-to-left table it is the left.
   *
   * **Reflected, because the heading is drawn by a stylesheet and has no other
   * way to learn it.** Set as a property, which is how React sets it, an
   * unreflected edge left no attribute to select on, so the heading stayed at
   * the start over a column of digits set to the end. It is the author's
   * declaration and nothing moves it afterwards, so an attribute cannot come to
   * disagree with the element, which is the reason `open` records a custom
   * state instead. No default, so an unset column writes nothing onto its host.
   */
  @property({ attribute: 'text-align', reflect: true })
  textAlign?: 'center' | 'end' | 'start'

  /**
   * The track this column takes, as CSS.
   *
   * A single track value, so anything valid in `grid-template-columns` works:
   * `16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column takes the track in
   * its place in a `Table`'s `columns`, where that table sets one, and
   * otherwise shares what is left over equally, as `minmax(max-content, 1fr)`.
   * Set here, it wins over that list, which is what lets a reader resize a
   * column in a table that set one.
   *
   * **The floor is `max-content`, never `0` and never `min-content`.** A zero
   * floor lets a track shrink under its own content: at 375 the columns squeeze
   * to 75px and `eu-central-1` wraps across lines, which reads as corrupt data
   * rather than as a table that ran out of room. A `min-content` floor still
   * breaks it, a hyphen being a wrap opportunity.
   *
   * The overflow has somewhere to go: `@fusion.dev/helix` scrolls the table's
   * own box, so a long value pushes past the container and the table scrolls
   * instead of the value being destroyed. Measured at 375: tracks of 192, 89 and
   * 102 against a 343 box, so the table scrolls 384 and the page does not move.
   *
   * The cost is that a column of prose asks for its longest paragraph on one
   * line, so a column holding sentences rather than values wants
   * `width="minmax(0, 1fr)"` to opt back into wrapping. A headless consumer owns
   * the overflow either way, that being paint, and gets the honest track list.
   */
  @property()
  width = ''

  /**
   * The text screen readers announce for the column's width. `{width}` is
   * replaced with the width.
   */
  @property({ attribute: 'width-label' })
  widthLabel = '{width} pixels'

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isTableColumn = true

  /**
   * @internal Which way this column is currently ordered, written by the table
   * that owns the sort. Not a consumer's to set: the sort lives on the table,
   * and a column that disagreed with it would announce an order the rows are
   * not in.
   */
  @state()
  sorted: 'ascending' | 'descending' | undefined = undefined

  /**
   * @internal Whether the table this sits in lets a reader move it, written by
   * that table. Not a consumer's to set: the order is the table's, and a grip
   * on a column the table will not move is a control that does nothing.
   */
  @state()
  movable = false

  /** How wide the heading drew, for the separator to report. */
  @state()
  private drawn = 0

  /** Where a drag of the separator started, while one is running. */
  private resizing: { from: number; start: number } | undefined

  /** Watches the heading's width, which changes with the table as well as with a drag. */
  private watcher: ResizeObserver | undefined

  /** Watches `hidden`, which is the platform's attribute and no property of this element's. */
  private hiding: MutationObserver | undefined

  /**
   * The narrowest width a column can be dragged to, in pixels.
   *
   * Three characters and the inset around them. Narrower and the heading has
   * nothing left to be read by, and the separator is a grab target with no
   * column beside it.
   */
  static readonly NARROWEST = 48

  /** The step the arrow keys move the separator by, in pixels. */
  static readonly STEP = 16

  /** The track this column contributes, resolved. */
  get track(): string {
    return this.width || 'minmax(max-content, 1fr)'
  }

  /**
   * @internal Whether this column takes a track, read by the table that holds
   * it. Not a consumer's to read: `hidden` is the setting. Read off the
   * attribute the way `HelixElement` hides a host, so the table drops a track
   * exactly when the heading stops being drawn.
   */
  get shown(): boolean {
    const hidden = this.getAttribute('hidden')
    return hidden === null || hidden === 'until-found'
  }

  /**
   * Whether the table can be sorted by this column, which needs `sortable` and
   * a `field`.
   */
  get canSort(): boolean {
    return this.sortable && this.field !== ''
  }

  /**
   * The value this column shows for a row.
   *
   * `cell` first, then the field. An explicit reader that returns `undefined` is
   * treated as declining rather than as an answer, so a formatter can hand the
   * default back for the rows it has nothing to say about.
   */
  read(row: Readonly<Record<string, unknown>>): unknown {
    const rendered = this.cell?.(row)
    return rendered === undefined ? at(row, this.field) : rendered
  }

  /**
   * The value this column sorts and filters by for a row, which can differ from
   * what it shows.
   */
  order(row: Readonly<Record<string, unknown>>): unknown {
    const compared = this.compare?.(row)
    return compared === undefined ? at(row, this.field) : compared
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* **`aria-sort` is not decoration.** A `columnheader` a reader can reorder
       by has to say which way it is ordered and which headers are orderable at
       all, or the whole affordance exists only for a reader who can see the rows
       move. `none` on the sortable ones that are not currently the sort is the
       part that carries the second half: it is what tells a screen reader this
       column can be sorted, where an absent attribute says nothing.

       Off the internals rather than the attribute, for the same reason the role
       is: it is this element's own semantics rather than markup a consumer
       wrote, and an attribute here is one more thing hydration can disagree
       about. */
    hostAria(this.internals, { role: 'columnheader' })
    /* Set here rather than through `hostAria`, which carries the four semantics
       every family needs and not this one. */
    this.internals.ariaSort = this.canSort ? (this.sorted ?? 'none') : null
    /* And the same fact as a custom state, because ARIA is not a style hook.
       Whoever draws this column draws the caret, and had nothing to draw it
       from: no state and no part told the sorted column from the rest, so the
       only way to it was listening for `helix-sort` and reading the order back a
       microtask later, which is a lot of machinery for one glyph. */
    /* Through `toggleState`, which carries the feature test, the way
       `pagination-root.ts` does in this same hook. Safari below 17.4 and
       Firefox below 126 have no `CustomStateSet`, and there
       `internals.states.delete` is a `TypeError` thrown from `willUpdate`: the
       column would fail to render rather than render without a caret. Each
       name written out, since a state is read from the source as a literal. */
    this.toggleState('sorted-ascending', this.sorted === 'ascending')
    this.toggleState('sorted-descending', this.sorted === 'descending')
  }

  /** The words of the heading, for naming the controls on it. */
  private get name(): string {
    /* `?? ''` is the server, where the element shim has no text to read. */
    return this.textContent?.trim() ?? ''
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof ResizeObserver !== 'undefined') {
      this.watcher = new ResizeObserver(([entry]) => {
        this.drawn = Math.round(entry?.borderBoxSize?.[0]?.inlineSize ?? 0)
      })
      /* On a reconnect the heading is already drawn and `firstUpdated` will not
         run again, so the new observer is given it here. */
      this.observeHeading()
    }
    /* `hidden` changes which tracks the table lays out, and nothing here
       renders differently for it, so no property of this element's carries it
       to `updated`. Watched the way `text-align` and `width` are passed on. */
    if (typeof MutationObserver !== 'undefined') {
      this.hiding = new MutationObserver(() => this.tellHolder())
      this.hiding.observe(this, { attributeFilter: ['hidden'] })
    }
  }

  private observeHeading(): void {
    const heading = this.partNamed('column')
    if (heading) {
      this.watcher?.observe(heading)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.hiding?.disconnect()
    this.hiding = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.observeHeading()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* **The table reads this column in its own render, and a property changing
       here is nothing the table hears.** A resize in a `Table` moved the
       separator and left the track where it was, the track list being composed
       from every column's width once and never again, and the cells under a
       column take their edge from the same render. Asked of whatever holds
       the column rather than of a table by name: both tables are Lit elements
       that read it when they render, and a column held by anything else has
       nobody to tell. */
    if (changed.has('textAlign') || changed.has('width')) {
      this.tellHolder()
    }
  }

  /** Asks whatever holds this column to render, since it reads the column when it does. */
  private tellHolder(): void {
    ;(this.parentElement as Partial<ReactiveElement> | null)?.requestUpdate?.()
  }

  /**
   * Asks for a width, in pixels, no narrower than a column can be read at.
   *
   * Through the same request every controlled value here uses: announced, and
   * applied only where nobody refused it.
   */
  private resizeTo(px: number): void {
    const next = `${Math.max(HelixHeadlessTableColumn.NARROWEST, Math.round(px))}px`
    if (next === this.width) {
      return
    }
    requestChange({
      apply: (value) => {
        this.width = value
      },
      event: (value) => new HelixBeforeResizeEvent({ value }),
      host: this,
      next,
    })
  }

  /** Which way a drag grows the column, in this writing direction. */
  private get forward(): number {
    return isRtl(this) ? -1 : 1
  }

  private readonly handleResizeStart = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    /* Captured so the drag keeps coming here once the pointer leaves the strip,
       and allowed to fail: a pointer the browser no longer counts as active
       throws, and losing the capture costs a drag that stops at the edge. */
    try {
      ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    } catch {
      /* The drag still works while the pointer stays over the strip. */
    }
    this.resizing = { from: event.clientX, start: this.drawn }
  }

  private readonly handleResizeMove = (event: PointerEvent): void => {
    if (this.resizing) {
      this.resizeTo(this.resizing.start + (event.clientX - this.resizing.from) * this.forward)
    }
  }

  private readonly handleResizeEnd = (): void => {
    this.resizing = undefined
  }

  /**
   * The separator's keys: a step each way, four with Shift, and Home for the
   * narrowest. Arrows follow the writing direction, so the one pointing away
   * from the heading's start always widens it.
   */
  private readonly handleResizeKey = (event: KeyboardEvent): void => {
    const step = HelixHeadlessTableColumn.STEP * (event.shiftKey ? 4 : 1)
    const grow = inlineStep(this, event.key)
    if (grow !== 0) {
      event.preventDefault()
      this.resizeTo(this.drawn + grow * step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      this.resizeTo(HelixHeadlessTableColumn.NARROWEST)
    }
  }

  protected override render(): TemplateResult {
    const name = this.name
    return html`<span part="column">${
      this.movable
        ? html`<button part="grip" type="button" aria-label=${fillTemplate(this.moveLabel, { name: name || 'column' })}>
            <svg aria-hidden="true" fill="currentColor" part="grip-mark" viewBox=${dotsThreeVertical.viewBox}>
              ${unsafeSVG(dotsThreeVertical.content)}
            </svg>
          </button>`
        : nothing
    }${
      this.canSort
        ? html`<button part="sort" type="button"><slot></slot></button>`
        : html`<slot></slot>`
    }${
      this.resizable
        ? html`<span
            part="resizer"
            role="separator"
            tabindex="0"
            aria-label=${fillTemplate(this.resizeLabel, { name: name || 'column' })}
            aria-orientation="vertical"
            aria-valuemin=${HelixHeadlessTableColumn.NARROWEST}
            aria-valuemax="4096"
            aria-valuenow=${Math.max(HelixHeadlessTableColumn.NARROWEST, this.drawn)}
            aria-valuetext=${fillTemplate(this.widthLabel, { width: this.drawn })}
            @keydown=${this.handleResizeKey}
            @pointerdown=${this.handleResizeStart}
            @pointermove=${this.handleResizeMove}
            @pointerup=${this.handleResizeEnd}
            @pointercancel=${this.handleResizeEnd}
          ></span>`
        : nothing
    }</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-column': HelixHeadlessTableColumn
  }
}
