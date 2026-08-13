import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * @since 0.1.0
 * @status experimental
 * @aliases DataTable, Grid table
 * @documentation https://helix.fusion.dev/components/table
 *
 * @slot - The table's rows.
 *
 * @csspart table - The grid.
 *
 * @cssproperty --table-columns - Track list for the columns.
 */
@customElement('helix-base-table')
export class HelixBaseTable extends HelixElement {
  /**
   * Column track list, as CSS.
   *
   * A raw track list rather than a count, because a table's columns are rarely
   * equal: `16rem minmax(0, 1fr)` is the common shape and no count expresses it.
   */
  @property()
  columns = ''

  /** Accessible name for the table. */
  @property()
  label = ''

  protected override render(): TemplateResult {
    return html`<div
      part="table"
      role="table"
      aria-label=${this.label || 'Table'}
      style=${this.columns ? `--table-columns: ${this.columns}` : ''}
    >
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-table': HelixBaseTable
  }
}
