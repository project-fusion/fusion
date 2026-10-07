import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { searchableById } from '../../utils/element-by-id/element-by-id.js'
import { words } from '../../words/words.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** A chart that names the table it reads with `for`. */
interface ChartHost extends HelixElement {
  /** The id of the table the chart reads. */
  for: string
}

/**
 * The public surface `MixinChartStatus` adds.
 *
 * Declared apart from the class for the reason `MixinChartSourceInterface`
 * gives: TypeScript cannot emit declarations for an anonymous class with
 * protected members.
 */
export declare class MixinChartStatusInterface {
  /**
   * The words shown in place of the drawing when the table has no readings,
   * and the fallback of the `empty` slot.
   */
  emptyText: string
  /**
   * Whether the readings are still on their way. The chart shows
   * `loading-text` in place of an empty drawing until it has readings.
   */
  loading: boolean
  /**
   * The words shown in place of the drawing while `loading` is set and there
   * are no readings yet, and the fallback of the `loading` slot.
   */
  loadingText: string
  /**
   * What stands in the plot while there is nothing to draw: the `loading`
   * line, the `empty` line, or nothing while the table cannot be read yet.
   */
  protected renderStatus(): TemplateResult | typeof nothing
}

/**
 * What a chart shows in place of its drawing when it has no readings: words
 * while they load, and words when the table it reads has none.
 *
 * **A blank box said neither.** A chart pointed at an empty table drew its
 * plot at full height with nothing in it, which reads as a chart that failed,
 * and one waiting for a request drew the same. `Table` and `Data Table` take
 * the same pair, `empty-text` and `loading-text` with `empty` and `loading`
 * slots for markup, such as a link to add the first reading.
 *
 * **Nothing at all while the table cannot be read**, which is a server render
 * and the hydrating one after it: there is no document to resolve `for` in, so
 * "No readings" there would be a claim about a table nobody has looked at.
 * `Heatmap` keeps the same rule for its own `empty-text`.
 *
 * Applied by the four charts that draw on axes. The slots and parts are
 * documented on each of them, a class-level tag on a mixin reaching no
 * manifest.
 */
export const MixinChartStatus = <T extends Constructor<ChartHost>>(
  Base: T,
): T & Constructor<MixinChartStatusInterface> => {
  class ChartStatusElement extends Base {
    /**
     * The key the empty and loading words are registered under: the host's
     * own, which each chart names with its styled tag, `static words =
     * 'helix-line-chart'`. A host with none reads its tag name.
     */
    static words = ''

    /**
     * The words shown in place of the drawing when the table has no readings,
     * and the fallback of the `empty` slot.
     */
    @words
    @property({ attribute: 'empty-text' })
    emptyText = 'No readings'

    /**
     * Whether the readings are still on their way. The chart shows
     * `loading-text` in place of an empty drawing until it has readings.
     *
     * Reflected, so a stylesheet can treat the chart while it waits. A chart
     * that already has readings keeps drawing them, so a refresh does not
     * blank it.
     */
    @property({ reflect: true, type: Boolean })
    loading = false

    /**
     * The words shown in place of the drawing while `loading` is set and
     * there are no readings yet, and the fallback of the `loading` slot.
     */
    @words
    @property({ attribute: 'loading-text' })
    loadingText = 'Loading readings'

    /**
     * What stands in the plot while there is nothing to draw: the `loading`
     * line, the `empty` line, or nothing while the table cannot be read yet.
     *
     * `dir="auto"`, so words in a right-to-left script read their own way in
     * a plot that holds itself left to right, as Scatter Chart's does.
     */
    protected renderStatus(): TemplateResult | typeof nothing {
      if (this.loading) {
        return html`<p dir="auto" part="loading"><slot name="loading">${this.loadingText}</slot></p>`
      }
      const known = this.for === '' || (!this.hydrating && searchableById(this))
      return known
        ? html`<p dir="auto" part="empty"><slot name="empty">${this.emptyText}</slot></p>`
        : nothing
    }
  }

  return ChartStatusElement as T & Constructor<MixinChartStatusInterface>
}
