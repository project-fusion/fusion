import { customElement, HelixElement, numberConverter } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type PartialView, readPartialView } from '../../data-table/view.js'

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
   * How many rows the preset shows, where the table cannot count them, as a
   * table in `server` mode cannot. Left unset, the row counts the rows the
   * table holds.
   */
  @property({ converter: numberConverter('count', undefined) })
  count?: number

  /**
   * The parts of the table's view the preset sets, as JSON, such as
   * `{"filters":[{"field":"status","operator":"any","values":["Overdue"]}]}`.
   * Only the parts it names are set.
   */
  @property()
  view = ''

  /** @internal Read by the row that draws the preset. */
  readonly isQuickFilter = true

  /** The parts of the view the preset sets, read from `view`. Text that is not JSON sets nothing. */
  get parts(): PartialView {
    try {
      return readPartialView(JSON.parse(this.view))
    } catch {
      return {}
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-quick-filter': HelixHeadlessQuickFilter
  }
}
