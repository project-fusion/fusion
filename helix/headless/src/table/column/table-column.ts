import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
const at = (row: Readonly<Record<string, unknown>>, path: string): unknown => {
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

/**
 * @summary One column of a table: its heading, how wide it is, and what it reads.
 *
 * @description
 * **The column is the source of both its heading and its track.** Add one and
 * the table has another track; remove one and it does not. Declaring the widths
 * separately, as a CSS track list on the table, leaves nothing tying the two
 * together: a table with three headings and a two-track list renders without
 * complaint, and a track list that is accidentally the headings is invalid CSS
 * the grid silently ignores, collapsing the whole table into one column.
 *
 * **It is also where every per-column fact goes**, which is the reason
 * `helix-data-table` needs no column config object. `field` names the key the
 * cell reads, `sortable` says a reader may reorder by it, `align` says which
 * edge the values line up against, and `cell` takes a function for anything the
 * field alone cannot express. The schema is markup and the data is a property:
 * a schema is small, declarative, and something a reader should be able to see
 * in the HTML, and data is large and windowed.
 *
 * **The same element serves both tables**, the markup one and the data one. It
 * is identified by a flag rather than by `instanceof`, so a `helix-table-column`
 * works inside either without the two roots sharing anything else.
 *
 * **It generates no box of its own**, the same as a row: the heading is a grid
 * item of the table, so it lines up with the cells under it rather than sitting
 * in a wrapper that has to be kept the same width.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Column header, Th
 * @documentation https://helix.fusion.dev/components/table
 *
 * @slot - The heading.
 *
 * @csspart column - The heading cell.
 */
@customElement('helix-headless-table-column')
export class HelixHeadlessTableColumn extends HelixElement {
  /**
   * Which edge the values line up against.
   *
   * `end` is what a column of numbers wants, so digits of the same magnitude sit
   * above each other. Left unset the cell inherits the table's own alignment,
   * which is `start` for text in either writing direction.
   */
  @property()
  align: 'center' | 'end' | 'start' | '' = ''

  /**
   * How to read the cell, where the field alone will not do.
   *
   * A property and not an attribute, because it is a function. Set it from a Lit
   * template with `.cell=${...}`, or assign it in script. A column with neither
   * this nor a `field` renders an empty cell rather than the whole row stringified,
   * which is the failure mode of guessing.
   */
  @property({ attribute: false })
  cell: CellReader | undefined = undefined

  /**
   * How to read the value that gets sorted and filtered, where it is not the cell.
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
   * Whether a reader may reorder the set by this column.
   *
   * Ignored without a `field`, and silently: a column with nothing to sort by
   * has no order to offer, and refusing loudly would mean an actions column
   * carrying `sortable` breaks a table rather than doing nothing.
   */
  @property({ type: Boolean })
  sortable = false

  /**
   * The track this column takes, as CSS.
   *
   * A single track value, so anything valid in `grid-template-columns` works:
   * `16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
   * left over equally, as `minmax(max-content, 1fr)`.
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
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isTableColumn = true

  /** The track this column contributes, resolved. */
  get track(): string {
    return this.width || 'minmax(max-content, 1fr)'
  }

  /** Whether a reader can actually reorder by this column. */
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

  /** The value this column sorts and filters by, which is not always what it shows. */
  order(row: Readonly<Record<string, unknown>>): unknown {
    const compared = this.compare?.(row)
    return compared === undefined ? at(row, this.field) : compared
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'columnheader' })
  }

  protected override render(): TemplateResult {
    return html`<span part="column"><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-column': HelixHeadlessTableColumn
  }
}
