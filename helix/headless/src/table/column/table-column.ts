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
   * left over equally, which is `minmax(0, 1fr)` rather than `1fr`: a bare
   * `1fr` track keeps an automatic minimum and refuses to shrink under a long
   * cell, so one unbreakable value pushes the table past its container.
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
    return this.width || 'minmax(0, 1fr)'
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
