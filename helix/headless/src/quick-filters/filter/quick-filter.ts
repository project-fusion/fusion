import { customElement, HelixElement, numberConverter } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type PartialView, readView } from '../../data-table/view.js'

/** Reads a partial view written as JSON, keeping only the parts it names. */
const readPart = (value: string | null): PartialView => {
  let given: unknown
  try {
    given = JSON.parse(value ?? '')
  } catch {
    return {}
  }
  if (!given || typeof given !== 'object') {
    return {}
  }
  const whole = readView(given)
  const named = given as Record<string, unknown>
  const columns = named.columns as Record<string, unknown> | undefined
  return {
    ...('filters' in named ? { filters: whole.filters } : {}),
    ...('pageSize' in named ? { pageSize: whole.pageSize } : {}),
    ...('query' in named ? { query: whole.query } : {}),
    ...('sort' in named ? { sort: whole.sort } : {}),
    ...(columns && typeof columns === 'object'
      ? {
          columns: Object.fromEntries(
            (['hidden', 'order', 'pinned', 'widths'] as const)
              .filter((key) => key in columns)
              .map((key) => [key, whole.columns[key]]),
          ),
        }
      : {}),
  }
}

/**
 * @summary One preset in a Quick Filters row: a name and the parts of a Data Table's view it sets.
 *
 * @description
 * Write it inside `QuickFilters`. Its text is its name, and `view` holds the
 * parts of the view it sets, as JSON: a preset with `filters` replaces every
 * filter, and one without leaves them alone.
 *
 * ```html
 * <helix-quick-filter view='{"filters":[{"field":"status","operator":"any","values":["Overdue"]}]}'>Overdue</helix-quick-filter>
 * ```
 *
 * It draws nothing itself. The row draws a button for it, with how many rows
 * it would show.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Preset, Saved filter, View tab
 * @documentation https://fusion.dev/helix/components/quick-filters
 *
 * @slot - The preset's name.
 */
@customElement('helix-headless-quick-filter')
export class HelixHeadlessQuickFilter extends HelixElement {
  /**
   * The parts of the table's view the preset sets. Written as an attribute it
   * is read as JSON, and only the parts it names are set.
   */
  @property({ converter: { fromAttribute: readPart } })
  view: PartialView = {}

  /**
   * How many rows the preset shows, where the table cannot count them, as a
   * table in `server` mode cannot. Left unset, the row counts the rows the
   * table holds.
   */
  @property({ converter: numberConverter('count', undefined) })
  count?: number

  /** @internal Read by the row that draws the preset. */
  readonly isQuickFilter = true

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-quick-filter': HelixHeadlessQuickFilter
  }
}
