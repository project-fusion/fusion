import { customElement, formatWords, HelixElement, words } from '@fusion.dev/helix-core'
import { nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { TableBinding, type ToolTable } from '../../data-table/binding.js'
import type {
  ExportColumns,
  ExportData,
  ExportFormat,
  ExportOptions,
  ExportRows,
  ExportValues,
} from '../../data-table/export.js'
import '../../button/index.js'

/** What the panel needs of a table beyond what every tool does. */
interface ExportTable extends ToolTable {
  download(options: ExportOptions): boolean
  exportData(options: ExportOptions): ExportData
  exportRows(options: ExportOptions): string
  xlsx?: ((data: ExportData) => Uint8Array) | undefined
}

/** The choices as they stand. */
interface ExportChoices {
  columns: ExportColumns
  format: ExportFormat
  rows: ExportRows
  values: ExportValues
}

const exports = (table: ToolTable | null): table is ExportTable =>
  table !== null && typeof (table as Partial<ExportTable>).download === 'function'

/**
 * @summary A panel that exports a Data Table's rows: which rows, which columns, which values, and the format.
 *
 * @description
 * Set `for` to the id of a `DataTable`, and put the panel in a `Popover` or
 * a `Dialog` opened by an Export button.
 *
 * ```html
 * <helix-table-export for="invoices"></helix-table-export>
 * ```
 *
 * It asks four things, each with how many it covers:
 *
 * - **Rows**: the selected rows, the rows the search and filters leave, or every row.
 * - **Columns**: the columns showing, or every column.
 * - **Values**: as the cells show them, or as the rows hold them.
 * - **Format**: CSV, TSV, or JSON, and XLSX where the table's `xlsx` is set.
 *
 * Export asks the table to `download` the file, which fires
 * `helix-before-export` on the table. Cancel that to make the file on your
 * server. Copy puts the rows on the clipboard as TSV, which pastes into a
 * spreadsheet as cells.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Download, Export dialog
 * @documentation https://fusion.dev/helix/components/table-export
 *
 * @csspart actions - The row that holds Copy and Export.
 * @csspart choice - One choice: its input and its words.
 * @csspart choice-checked - Added to `choice` while it is chosen.
 * @csspart choice-input - The radio input of a choice.
 * @csspart columns - The group that chooses the columns.
 * @csspart copy - The button that copies the rows.
 * @csspart copy-button - Forwarded from the button: the button inside `copy`.
 * @csspart copy-live - Forwarded from the button. Not shown in the panel, whose buttons do not load.
 * @csspart copy-spinner - Forwarded from the button. Not shown in the panel, whose buttons do not load.
 * @csspart copy-text - Forwarded from the button: the words inside `copy`.
 * @csspart export - The button that saves the file.
 * @csspart export-button - Forwarded from the button: the button inside `export`.
 * @csspart export-live - Forwarded from the button. Not shown in the panel, whose buttons do not load.
 * @csspart export-spinner - Forwarded from the button. Not shown in the panel, whose buttons do not load.
 * @csspart export-text - Forwarded from the button: the words inside `export`.
 * @csspart format - The group that chooses the format.
 * @csspart legend - A group's name.
 * @csspart live - The region that says the rows were copied. Visually hidden in the styled tier.
 * @csspart rows - The group that chooses the rows.
 * @csspart values - The group that chooses the values.
 */
@customElement('helix-headless-table-export')
export class HelixHeadlessTableExport extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-table-export': { copyLabel: 'Kopieren' } })`.
   */
  static words = 'helix-table-export'

  /** The words for every column. `{count}` is how many there are. */
  @words
  @property({ attribute: 'all-columns-label' })
  allColumnsLabel = 'All ({count})'

  /** The words for every row. `{count}` is how many there are. */
  @words
  @property({ attribute: 'all-rows-label' })
  allRowsLabel = 'All ({count})'

  /** The name of the group that chooses the columns. */
  @words
  @property({ attribute: 'columns-label' })
  columnsLabel = 'Columns'

  /** What a screen reader hears once the rows are copied. `{count}` is how many. */
  @words
  @property({ attribute: 'copied-label' })
  copiedLabel = '{count, plural, one {# row copied} other {# rows copied}}'

  /** The words on the button that copies the rows. */
  @words
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy'

  /** The words on the button that saves the file. `{count}` is how many rows it holds. */
  @words
  @property({ attribute: 'export-label' })
  exportLabel = '{count, plural, one {Export # row} other {Export # rows}}'

  /** The words for the rows the search and the filters leave. `{count}` is how many. */
  @words
  @property({ attribute: 'filtered-rows-label' })
  filteredRowsLabel = 'Filtered ({count})'

  /** The id of the `DataTable` the panel exports, in the same document or shadow root. */
  @property()
  for = ''

  /** The name of the group that chooses the format. */
  @words
  @property({ attribute: 'format-label' })
  formatLabel = 'Format'

  /** The words for the values as the rows hold them. */
  @words
  @property({ attribute: 'raw-label' })
  rawLabel = 'Raw'

  /** The name of the group that chooses the rows. */
  @words
  @property({ attribute: 'rows-label' })
  rowsLabel = 'Rows'

  /** The words for the selected rows. `{count}` is how many. */
  @words
  @property({ attribute: 'selected-rows-label' })
  selectedRowsLabel = 'Selected ({count})'

  /** The words for the values as the cells show them. */
  @words
  @property({ attribute: 'shown-label' })
  shownLabel = 'As shown'

  /** The name of the group that chooses the values. */
  @words
  @property({ attribute: 'values-label' })
  valuesLabel = 'Values'

  /** The words for the columns showing. `{count}` is how many. */
  @words
  @property({ attribute: 'visible-columns-label' })
  visibleColumnsLabel = 'Visible ({count})'

  /** Which rows go in, which a reader changes. */
  @state()
  private chosenRows: ExportRows | undefined = undefined

  /** Which columns go in. */
  @state()
  private chosenColumns: ExportColumns = 'visible'

  /** Which values go in. */
  @state()
  private chosenValues: ExportValues = 'shown'

  /** The format. */
  @state()
  private chosenFormat: ExportFormat = 'csv'

  @state()
  private said = ''

  protected readonly binding = new TableBinding(this)

  /** The bound table, once it is in the tree. */
  get table(): ToolTable | null {
    return this.binding.table
  }

  /** The choices as they stand: the selected rows where some are, and the filtered ones otherwise. */
  get options(): ExportChoices {
    const table = this.table
    const selected = table ? table.selected.split(',').filter(Boolean).length : 0
    return {
      columns: this.chosenColumns,
      format: this.chosenFormat,
      rows: this.chosenRows ?? (selected > 0 ? 'selected' : 'filtered'),
      values: this.chosenValues,
    }
  }

  /** Saves the file, as Export does. */
  export(): boolean {
    const table = this.table
    return exports(table) ? table.download(this.options) : false
  }

  /** Copies the rows as TSV, as Copy does. */
  async copy(): Promise<boolean> {
    const table = this.table
    if (!exports(table) || !navigator.clipboard) {
      return false
    }
    const options = { ...this.options, format: 'tsv' as const }
    try {
      await navigator.clipboard.writeText(table.exportRows(options))
    } catch {
      return false
    }
    this.said = formatWords(this, 'copiedLabel', { count: table.exportData(options).rows.length })
    return true
  }

  /** The choices of one group, each a radio input in its label. */
  protected renderChoices<T extends string>(
    name: string,
    current: T,
    choices: readonly { label: string; value: T }[],
    choose: (value: T) => void,
  ): TemplateResult[] {
    return choices.map(
      (choice) => html`<label part="choice${choice.value === current ? ' choice-checked' : ''}"
        ><input
          part="choice-input"
          type="radio"
          name=${name}
          .value=${choice.value}
          .checked=${choice.value === current}
          @change=${() => choose(choice.value)}
        />${choice.label}</label
      >`,
    )
  }

  /** Copy and Export, as this tier's buttons. */
  protected renderActions(count: number, found: boolean): TemplateResult {
    const button = this.tag('button')
    return html`<div part="actions">
      <${button} part="copy" exportparts="button: copy-button, live: copy-live, spinner: copy-spinner, text: copy-text" ?disabled=${!found} @click=${() => this.copy()}>${this.copyLabel}</${button}>
      <${button} part="export" exportparts="button: export-button, live: export-live, spinner: export-spinner, text: export-text" ?disabled=${!found || count === 0} @click=${() => this.export()}
        >${formatWords(this, 'exportLabel', { count })}</${button}
      >
    </div>`
  }

  protected override render(): TemplateResult {
    const table = this.table
    const options = this.options
    const selected = table ? table.selected.split(',').filter(Boolean).length : 0
    const columns = table?.tableColumns.filter((column) => column.field !== '') ?? []
    const visible = table
      ? columns.filter((column) => !table.view.columns.hidden.includes(column.field)).length
      : 0
    const count =
      options.rows === 'selected'
        ? selected
        : options.rows === 'all'
          ? (table?.everyRowCount ?? 0)
          : (table?.matched ?? 0)
    const formats: { label: string; value: ExportFormat }[] = [
      { label: 'CSV', value: 'csv' },
      { label: 'TSV', value: 'tsv' },
      { label: 'JSON', value: 'json' },
      ...(exports(table) && table.xlsx ? [{ label: 'XLSX', value: 'xlsx' as const }] : []),
    ]
    return html`<fieldset part="rows">
        <legend part="legend">${this.rowsLabel}</legend>
        ${this.renderChoices(
          'rows',
          options.rows,
          [
            ...(selected > 0
              ? [
                  {
                    label: formatWords(this, 'selectedRowsLabel', { count: selected }),
                    value: 'selected' as const,
                  },
                ]
              : []),
            {
              label: formatWords(this, 'filteredRowsLabel', { count: table?.matched ?? 0 }),
              value: 'filtered' as const,
            },
            {
              label: formatWords(this, 'allRowsLabel', { count: table?.everyRowCount ?? 0 }),
              value: 'all' as const,
            },
          ],
          (value) => (this.chosenRows = value),
        )}
      </fieldset>
      <fieldset part="columns">
        <legend part="legend">${this.columnsLabel}</legend>
        ${this.renderChoices(
          'columns',
          options.columns,
          [
            {
              label: formatWords(this, 'visibleColumnsLabel', { count: visible }),
              value: 'visible',
            },
            {
              label: formatWords(this, 'allColumnsLabel', { count: columns.length }),
              value: 'all',
            },
          ],
          (value) => (this.chosenColumns = value),
        )}
      </fieldset>
      <fieldset part="values">
        <legend part="legend">${this.valuesLabel}</legend>
        ${this.renderChoices(
          'values',
          options.values,
          [
            { label: this.shownLabel, value: 'shown' },
            { label: this.rawLabel, value: 'raw' },
          ],
          (value) => (this.chosenValues = value),
        )}
      </fieldset>
      <fieldset part="format">
        <legend part="legend">${this.formatLabel}</legend>
        ${this.renderChoices('format', options.format, formats, (value) => (this.chosenFormat = value))}
      </fieldset>
      ${this.renderActions(count, table !== null)}
      <span part="live" aria-live="polite">${this.said || nothing}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-export': HelixHeadlessTableExport
  }
}
