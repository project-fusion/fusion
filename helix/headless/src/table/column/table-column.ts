import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One column of a table: its heading, and how wide it is.
 *
 * @description
 * A column is a heading and a width, declared together, because they are two
 * facts about one thing and keeping them apart is what went wrong before.
 *
 * **This replaces a `columns` string on the table.** That property took a CSS
 * track list, so the headings lived in a row of cells and the widths lived in
 * an attribute, and nothing tied the two together: a table with three headings
 * and a two-track list rendered without complaint. Worse, handing it the
 * headings instead of a track list produced invalid CSS, which the grid
 * silently ignored, so the whole table collapsed into one column and every cell
 * stacked. That happened, in this library's own example, and the failure said
 * nothing at all.
 *
 * Now the column is the source of both. Add one and the table has another
 * track; remove one and it does not.
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
   * The track this column takes, as CSS.
   *
   * A single track value, so anything valid in `grid-template-columns` works:
   * `16rem`, `auto`, `minmax(0, 2fr)`. Left unset the column shares what is
   * left over equally, as `minmax(max-content, 1fr)`.
   *
   * **The floor was `0` and that is what broke a narrow table.** A zero floor
   * lets a track shrink under its own content, so at 375 the columns were
   * squeezed to 75px and `eu-central-1` wrapped across lines, which reads as
   * corrupt data rather than as a table that ran out of room. The zero was
   * chosen to stop one long value pushing the table past its container, and
   * that was the right worry with nowhere for the overflow to go.
   *
   * Somewhere now exists: `@helix-io/styled` scrolls the table's own box. So a
   * long value pushes past the container as the old comment feared, and the
   * table scrolls instead of the value being destroyed. Measured at 375: tracks
   * of 192, 89 and 102 against a 343 box, so the table scrolls 384 and the page
   * does not move.
   *
   * **`max-content` and not `min-content`, because a hyphen is a wrap
   * opportunity.** A `min-content` floor still broke `eu-central-1` at its
   * hyphens, which is the whole of the reported fault. The cost is that a
   * column of prose asks for its longest paragraph on one line, so a column
   * holding sentences rather than values wants `width="minmax(0, 1fr)"` to opt
   * back into wrapping. A headless consumer owns the overflow either way, that
   * being paint, and gets the honest track list.
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
