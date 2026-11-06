import {
  customElement,
  formatWords,
  HelixElement,
  MIRROR_RULE,
  words,
} from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import { nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import { columnName, TableBinding, type ToolTable } from '../../data-table/binding.js'
import type { DataTableView } from '../../data-table/view.js'
import '../../button/index.js'

/** The sections the panel lists, in order. */
type Section = 'columns' | 'export' | 'filters' | 'sort'

/** A drawer or a dialog the panel is in, which Show closes. */
interface Closable extends Element {
  hide(): unknown
  open: boolean
}

const closable = (element: Element): element is Closable =>
  typeof (element as Partial<Closable>).hide === 'function' &&
  (element as Partial<Closable>).open === true

/**
 * @summary A panel that changes a Data Table's whole view on a phone: its presets, filters, sort, columns, and export.
 *
 * @description
 * On a phone a table has no room above it for a filter field, a Columns
 * button and an Export button. Put this panel in a `Drawer` opened by one
 * View button, set `for` to the table's id, and slot the tools into it:
 *
 * ```html
 * <helix-drawer label="View" placement="bottom">
 *   <helix-view-panel for="invoices">
 *     <helix-quick-filters slot="presets" for="invoices">…</helix-quick-filters>
 *     <helix-filter-input slot="filters" for="invoices"></helix-filter-input>
 *     <helix-column-manager slot="columns" for="invoices"></helix-column-manager>
 *     <helix-table-export slot="export" for="invoices"></helix-table-export>
 *   </helix-view-panel>
 * </helix-drawer>
 * ```
 *
 * The panel lists Filters, Sort, Columns, and Export, each with what it holds
 * now, such as "Status, Amount" or "Due, descending". A press opens that
 * section in the panel, and Back returns to the list. A section with nothing
 * slotted is left out, except Sort, which the panel draws itself from the
 * table's `sortable` columns. Reset clears the search, the filters, and the
 * sort. Show closes the drawer or the dialog the panel is in, with how many
 * rows the view shows.
 *
 * `active` counts the search and the filters, for a badge on the View button.
 * The panel takes no width of its own, so show its View button at the widths
 * that need it, and the tools above the table at the rest.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases View drawer, View sheet, Mobile filters
 * @documentation https://fusion.dev/helix/components/view-panel
 *
 * @slot columns - A `ColumnManager` for the table.
 * @slot export - A `TableExport` for the table.
 * @slot filters - A `FilterInput` bound to the table, or your own filters.
 * @slot presets - A `QuickFilters` row for the table, shown above the sections.
 *
 * @csspart back - The button that returns from a section to the list.
 * @csspart choice - One sort order, its input and its words.
 * @csspart choice-input - The radio input of a sort order.
 * @csspart header - The row that holds the title, or Back, and Reset.
 * @csspart page - The open section.
 * @csspart reset - The button that clears the search, the filters, and the sort.
 * @csspart section - One section's button in the list.
 * @csspart section-mark - The caret at the end of a section's button.
 * @csspart section-name - A section's name.
 * @csspart sections - The list of sections.
 * @csspart show - The button that closes the panel's drawer, with how many rows the view shows.
 * @csspart show-button - Forwarded from the button: the button inside `show`.
 * @csspart show-live - Forwarded from the button. Not shown in the panel, whose button does not load.
 * @csspart show-spinner - Forwarded from the button. Not shown in the panel, whose button does not load.
 * @csspart show-text - Forwarded from the button: the words inside `show`.
 * @csspart sort - The sort orders the panel draws.
 * @csspart summary - What a section holds now.
 * @csspart title - The panel's heading.
 */
@customElement('helix-headless-view-panel')
export class HelixHeadlessViewPanel extends HelixElement {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-view-panel': { sortLabel: 'Sortierung' } })`.
   */
  static words = 'helix-view-panel'

  /** The words on the button that returns to the list. */
  @words
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /** The name of the Columns section. */
  @words
  @property({ attribute: 'columns-label' })
  columnsLabel = 'Columns'

  /** The name of the Export section. */
  @words
  @property({ attribute: 'export-label' })
  exportLabel = 'Export'

  /** The name the panel gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'View'

  /** The name of the Filters section. */
  @words
  @property({ attribute: 'filters-label' })
  filtersLabel = 'Filters'

  /** The id of the `DataTable` whose view the panel changes, in the same document or shadow root. */
  @property()
  for = ''

  /**
   * The panel's heading.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /** What the Sort and Filters sections say while nothing is set. */
  @words
  @property({ attribute: 'none-label' })
  noneLabel = 'None'

  /** The words on the button that clears the search, the filters, and the sort. */
  @words
  @property({ attribute: 'reset-label' })
  resetLabel = 'Reset'

  /** The words on the button that closes the panel. `{count}` is how many rows the view shows. */
  @words
  @property({ attribute: 'show-label' })
  showLabel = '{count, plural, one {Show # row} other {Show # rows}}'

  /**
   * One sort order, in the Sort section and its summary. `{column}` is the
   * column and `{direction}` is `ascending` or `descending`.
   */
  @words
  @property({ attribute: 'sorted-label' })
  sortedLabel = '{column}, {direction, select, ascending {ascending} other {descending}}'

  /** The name of the Sort section. */
  @words
  @property({ attribute: 'sort-label' })
  sortLabel = 'Sort'

  /** The section open now, or none for the list. */
  @state()
  private opened: Section | undefined = undefined

  protected readonly binding = new TableBinding(this)

  /** The bound table, once it is in the tree. */
  get table(): ToolTable | null {
    return this.binding.table
  }

  /** How many things narrow the rows: the search, and each filter. For a badge on the View button. */
  get active(): number {
    const view = this.table?.view
    return view ? view.filters.length + (view.query.trim() ? 1 : 0) : 0
  }

  /** Opens one section in the panel, or returns to the list with nothing. */
  openSection(section: Section | undefined): void {
    this.opened = section
  }

  /** Clears the search, the filters, and the sort, as Reset does. */
  reset(): boolean {
    return this.table?.requestView({ filters: [], query: '', sort: '' }) ?? false
  }

  /** Closes the drawer or the dialog the panel is in, as Show does. */
  show(): void {
    for (
      let at: Element | null = this;
      at;
      at = at.parentElement ?? (at.getRootNode() as ShadowRoot).host ?? null
    ) {
      if (closable(at)) {
        at.hide()
        return
      }
    }
  }

  /** Whether a slot of this name has something in it. */
  private holds(name: Section): boolean {
    return (
      name === 'sort' || this.knownChildren.some((child) => child.getAttribute('slot') === name)
    )
  }

  private summary(section: Section, table: ToolTable, view: DataTableView): string {
    const named = (field: string) => {
      const column = table.tableColumns.find((one) => one.field === field)
      return column ? columnName(column) : field
    }
    switch (section) {
      case 'filters': {
        const parts = [
          ...view.filters.map((filter) => named(filter.field)),
          ...(view.query.trim() ? [`“${view.query.trim()}”`] : []),
        ]
        return parts.length ? parts.join(', ') : this.noneLabel
      }
      case 'sort': {
        const [field, direction] = view.sort.split(':')
        return field
          ? formatWords(this, 'sortedLabel', {
              column: named(field),
              direction: direction === 'desc' ? 'descending' : 'ascending',
            })
          : this.noneLabel
      }
      case 'columns':
        return table.tableColumns
          .filter((column) => column.field !== '' && !view.columns.hidden.includes(column.field))
          .map(columnName)
          .join(', ')
      default:
        return ''
    }
  }

  protected renderSort(table: ToolTable): TemplateResult {
    const orders = [
      { label: this.noneLabel, value: '' },
      ...table.tableColumns
        .filter((column) => column.sortable && column.field !== '')
        .flatMap((column) =>
          (['asc', 'desc'] as const).map((direction) => ({
            label: formatWords(this, 'sortedLabel', {
              column: columnName(column),
              direction: direction === 'asc' ? 'ascending' : 'descending',
            }),
            value: `${column.field}:${direction}`,
          })),
        ),
    ]
    return html`<fieldset part="sort">
      <legend>${this.sortLabel}</legend>
      ${orders.map(
        (order) => html`<label part="choice"
          ><input
            part="choice-input"
            type="radio"
            name="sort"
            .value=${order.value}
            .checked=${table.view.sort === order.value}
            @change=${() => table.requestView({ sort: order.value })}
          />${order.label}</label
        >`,
      )}
    </fieldset>`
  }

  /** Show, as this tier's button. */
  protected renderShow(count: number): TemplateResult {
    const button = this.tag('button')
    return html`<${button}
      part="show"
      exportparts="button: show-button, live: show-live, spinner: show-spinner, text: show-text"
      @click=${() => this.show()}
      >${formatWords(this, 'showLabel', { count })}</${button}
    >`
  }

  protected override render(): TemplateResult {
    const table = this.table
    const view = table?.view
    const opened = this.opened
    const names: Record<Section, string> = {
      columns: this.columnsLabel,
      export: this.exportLabel,
      filters: this.filtersLabel,
      sort: this.sortLabel,
    }
    const sections = (['filters', 'sort', 'columns', 'export'] as const).filter((one) =>
      this.holds(one),
    )
    return html`<div part="header">
        ${
          opened
            ? html`<button part="back" type="button" @click=${() => this.openSection(undefined)}>${this.backLabel}</button>`
            : html`<span part="title">${this.label || this.fallbackLabel}</span>`
        }
        <button part="reset" type="button" @click=${() => this.reset()}>${this.resetLabel}</button>
      </div>
      <slot name="presets" ?hidden=${opened !== undefined}></slot>
      <div part="sections" ?hidden=${opened !== undefined}>
        ${sections.map(
          (
            section,
          ) => html`<button part="section" type="button" @click=${() => this.openSection(section)}>
            <span part="section-name">${names[section]}</span>
            ${table && view ? html`<span part="summary">${this.summary(section, table, view)}</span>` : nothing}
            <svg aria-hidden="true" data-mirror fill="currentColor" part="section-mark" viewBox=${caretRight.viewBox}>${unsafeSVG(caretRight.content)}</svg>
          </button>`,
        )}
      </div>
      <div part="page" ?hidden=${opened === undefined}>
        <slot name="filters" ?hidden=${opened !== 'filters'}></slot>
        <slot name="columns" ?hidden=${opened !== 'columns'}></slot>
        <slot name="export" ?hidden=${opened !== 'export'}></slot>
        ${opened === 'sort' && table ? this.renderSort(table) : nothing}
      </div>
      ${this.renderShow(table?.matched ?? 0)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-view-panel': HelixHeadlessViewPanel
  }
}
