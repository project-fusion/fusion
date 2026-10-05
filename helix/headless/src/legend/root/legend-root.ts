import {
  commaList,
  customElement,
  HelixBeforeChangeEvent,
  HelixElement,
  requestChange,
  type Series,
  SourceController,
  seriesIndex,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { isHidden, toggledNames } from '../hidden-series.js'

/**
 * @summary A list of the series in a chart, each name beside the color it is drawn in.
 *
 * @description
 * Renders a legend as a list, separate from any chart, so any chart can use
 * one. Set `for` to the table the chart reads, and the legend takes its entries
 * from that table, so the two always match.
 *
 * `entries` sets how the table is read:
 *
 * - `series`: one entry per data column, named by the header row. Use it for a
 *   line or bar chart.
 * - `categories`: one entry per body row. Use it for a donut, whose slices are
 *   the rows and which has no axis to name them on.
 * - `measures`: drops the first data column. Use it for a scatter.
 *
 * The table is resolved on the client. There is no server pass.
 *
 * **`toggles` makes each entry a button that hides its series.** Every chart
 * reading the same table draws without a hidden series and fits its scale to
 * the rest, and the series keeps its color. The button says whether its
 * series is shown with `aria-pressed`. `hidden-series` holds the hidden names,
 * so a page can start with some hidden or read which are.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Key, Series Key
 * @documentation https://fusion.dev/helix/components/legend
 *
 * @event {Event} change - Fired once a toggle has hidden or shown a series.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a toggle hides or shows a series, with the `hidden-series` it would leave. Cancelable.
 *
 * @csspart entry - One name and its swatch. Draw the swatch with
 * `::part(entry)::before` in your stylesheet. The entry holds its series color
 * as `--chart-series`, and this tier ships no CSS.
 * @csspart entry-hidden - An entry whose series is hidden. Set alongside `entry`.
 * @csspart list - The list of entries.
 * @csspart name - One series name.
 * @csspart toggle - The button around a name under `toggles`, which hides or shows its series.
 */
@customElement('helix-headless-legend')
export class HelixHeadlessLegend extends HelixElement {
  /**
   * How the entries are read from the table: `series`, `categories`, or
   * `measures`.
   *
   * Absent is `series`, one entry per data column. `categories` reads one entry
   * per body row instead, for a donut, whose slices are the rows.
   *
   * **`measures` is `series` without the first column, and it is for a
   * scatter.** That chart reads its first numeric column as the measure
   * *across*, so its first plotted series is the table's second and everything
   * a legend beside it named was one color out: the across column wearing the
   * color of the first series drawn, and each real series wearing the next
   * one's. The across gets no entry rather than a shifted one, because it is an
   * axis and a scatter already writes its name at the end of the scale under
   * the plot.
   *
   * A legend cannot ask the chart which of these it is, `for` naming the table
   * they share and not each other, so the consumer says it. That is the same
   * shape `categories` already has.
   */
  @property({ reflect: true })
  entries?: 'categories' | 'measures' | 'series'

  /**
   * The id of the table to take the names from.
   *
   * Names a table in the same tree, so a legend inside another component's
   * shadow root reads a table in that root rather than one in the document.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  @property()
  for = ''

  /**
   * The series hidden on the table, by name, separated by commas: what
   * `toggles` hides and shows.
   *
   * Set it to start with series hidden. Every chart reading the same table
   * draws without them. Commas only, because a column's heading may hold a
   * space. For a ring the names are the rows.
   */
  @property({ attribute: 'hidden-series' })
  hiddenSeries = ''

  /**
   * The name of the list, which a screen reader announces before its entries.
   *
   * Absent names the list after the table's caption, so a page with several
   * charts has a legend list for each that says which chart it keys.
   */
  @property()
  label = ''

  /**
   * Makes each entry a button that hides or shows its series in every chart
   * reading the same table.
   *
   * Absent, the legend only displays, which is what it did before this
   * existed. Reflected, because the styled tier draws a button differently
   * from a plain entry.
   */
  @property({ reflect: true, type: Boolean })
  toggles = false

  /* One controller rather than the resolve-and-watch each chart would write
     out for itself, which drifts into two names for the same lookup. */
  protected readonly source = new SourceController(this)

  /** Whether this legend has written the table's hidden series, so leaving undoes it. */
  private wrote = false

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.source.watch()
    }
  }

  /**
   * Hands `hidden-series` to the table, where every chart reading it finds
   * it.
   *
   * After the update rather than before, because a server has no table and a
   * hydrating render must draw what the server drew: the charts follow a frame
   * after the legend, which is when they draw at all.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    const names = commaList(this.hiddenSeries)
    if (names.length > 0 || this.wrote) {
      this.source.hide(names)
      this.wrote = names.length > 0
    }
  }

  override disconnectedCallback(): void {
    /* A legend that leaves takes its hidden series with it, so a chart is not
       left drawing without a series nobody can show again. */
    if (this.wrote) {
      this.source.hide([])
      this.wrote = false
    }
    super.disconnectedCallback()
  }

  /**
   * Hides the series of this name, or shows it again, asking first.
   *
   * `helix-before-change` carries the `hidden-series` the press would leave,
   * and a listener that refuses it keeps the chart as it is. `change` follows
   * once the series is hidden or shown.
   */
  protected toggle(name: string): void {
    requestChange({
      apply: (value) => {
        this.hiddenSeries = value
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next: toggledNames(this.hiddenSeries, name),
    })
  }

  /**
   * The names, in the order the chart will draw them.
   *
   * `protected` rather than private because the styled tier has to match a
   * per-series treatment against them, the way `BarChart` matches `outlined` and
   * `subtle` against the headings its table gives. A legend keys a chart, so the
   * two answer the same question about the same series, and the tier that paints
   * cannot do that without knowing which entry is which.
   */
  protected names(): string[] {
    const series: Series[] = this.source.series
    if (this.entries === 'categories') {
      return series[0]?.points.map((point) => point.label) ?? []
    }
    /* `slice(1)` and not an offset on the index below, so the swatch colors
       stay one to one with the palette slots the scatter draws its points in:
       its first plotted series is this list's first entry either way. */
    return (this.entries === 'measures' ? series.slice(1) : series).map((one) => one.name)
  }

  protected override render(): TemplateResult {
    /* The index rather than the color, because a color is a token and the
       headless tier holds none. The styled tier maps one to the other.
     *
     * `seriesIndex`, which is the charts' own, rather than a wrap written out
     * here. The comment over it in `core` records what a second copy costs:
     * when the palette went from eight to twenty-four one of five copies was
     * missed, and a legend naming a ninth series beside a chart painting it in
     * the first color is the one failure this component exists to prevent. This
     * was the sixth copy. */
    const named = this.label || this.source.element?.querySelector('caption')?.textContent?.trim()
    return html`<ul aria-label=${named || nothing} part="list" role="list">
      ${this.names().map((name, index) => {
        const off = isHidden(this.hiddenSeries, name)
        return html`<li
          data-series=${seriesIndex(index)}
          part="entry${off ? ' entry-hidden' : ''}"
          style="--chart-series: var(--chart-series-${seriesIndex(index)})"
          role="listitem"
        >
          ${this.toggles ? this.renderToggle(name, off) : html`<span part="name">${name}</span>`}
        </li>`
      })}
    </ul>`
  }

  /**
   * The button around a name under `toggles`, behind a seam a tier can move.
   *
   * Pressed while its series is shown, which is the state a reader changes by
   * pressing it: a toggle button says whether its thing is on.
   */
  protected renderToggle(name: string, off: boolean): TemplateResult {
    return html`<button
      aria-pressed=${off ? 'false' : 'true'}
      part="toggle"
      type="button"
      @click=${() => this.toggle(name)}
    >
      <span part="name">${name}</span>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-legend': HelixHeadlessLegend
  }
}
