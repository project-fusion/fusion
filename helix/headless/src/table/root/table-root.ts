import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixBaseTableColumn } from '../column/table-column.js'

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
   * Column track list, as CSS. Deprecated: declare columns instead.
   *
   * Kept for a table that has no `helix-table-column` children, and ignored the
   * moment it has one. A raw track list is the right shape for the value and
   * the wrong place for it: the headings and the widths were two halves of one
   * fact held in two places, and nothing checked that they agreed. Worse, the
   * value is CSS, so handing it headings by mistake produced an invalid track
   * list, which a grid ignores in silence: the table collapsed to one column
   * and said nothing. Columns carry both halves now.
   */
  @property()
  columns = ''

  /** Accessible name for the table. */
  @property()
  label = ''

  /** The columns declared as children, in the order they are written. */
  get tableColumns(): HelixBaseTableColumn[] {
    /* `?? []` is the server. Lit's element shim carries attributes and not a
       tree, so `children` is undefined there, and this getter is reached from
       `template`, which is read during `render`: spreading it threw and the
       whole SSR suite died on an unhandled error. The same fault the menu item
       had, in code written after it was fixed there, which is the argument for
       the SSR specs existing at all. */
    return [...(this.children ?? [])].filter(
      (child): child is HelixBaseTableColumn =>
        'isTableColumn' in child && child.isTableColumn === true,
    )
  }

  /**
   * The track list, from the columns if there are any.
   *
   * Read from the DOM rather than kept, so adding or removing a column needs
   * nothing else to be told. Falls back to the `columns` string for a table
   * written before columns existed, and to a single track for one that declares
   * neither.
   */
  private get template(): string {
    const declared = this.tableColumns
    if (declared.length > 0) {
      return declared.map((column) => column.track).join(' ')
    }
    return this.columns
  }

  /* Columns arrive from the light DOM, which changes no property here, so
     nothing would schedule the render that reads them. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    const template = this.template
    return html`<div
      part="table"
      role="table"
      aria-label=${this.label || 'Table'}
      style=${template ? `--table-columns: ${template}` : ''}
    >
      <slot @slotchange=${this.handleSlotChange}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-table': HelixBaseTable
  }
}
