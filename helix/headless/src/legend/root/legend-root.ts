import {
  customElement,
  HelixElement,
  type Series,
  SourceController,
  seriesIndex,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Key, Series Key
 * @documentation https://fusion.dev/helix/components/legend
 *
 * @csspart entry - One name and its swatch. Draw the swatch with
 * `::part(entry)::before` in your stylesheet. The entry holds its series color
 * as `--chart-series`, and this tier ships no CSS.
 * @csspart list - The list of entries.
 * @csspart name - One series name.
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
   * The name of the list, which a screen reader announces before its entries.
   *
   * Absent names the list after the table's caption, so a page with several
   * charts has a legend list for each that says which chart it keys.
   */
  @property()
  label = ''

  /* One controller rather than the resolve-and-watch each chart would write
     out for itself, which drifts into two names for the same lookup. */
  protected readonly source = new SourceController(this)

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.source.watch()
    }
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
      ${this.names().map(
        (name, index) => html`<li
          data-series=${seriesIndex(index)}
          part="entry"
          style="--chart-series: var(--chart-series-${seriesIndex(index)})"
          role="listitem"
        >
          <span part="name">${name}</span>
        </li>`,
      )}
    </ul>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-legend': HelixHeadlessLegend
  }
}
