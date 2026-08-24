import { customElement, HelixElement, type Series, SourceController } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** How many colours the series palette has, and so where it starts over. */
const PALETTE = 24

/**
 * @summary The names a chart draws, each beside the color it is drawn in.
 *
 * @description
 * A legend is a list, so it is a list: not part of a chart, and shared by
 * whichever of them needs one. It takes its entries from the same table the
 * chart reads, through `for`, so the two cannot disagree about how many series
 * there are or what they are called.
 *
 * `entries` picks which way to read that table, and the two ways are the two
 * shapes a chart comes in. `series` is one entry per data column, named by the
 * header row, which is a line or a bar chart. `categories` is one entry per
 * body row, named by its row header, which is a donut: its slices are the rows,
 * and it has no axis to write their names along.
 *
 * **The table is resolved on the client and there is no server pass.** `for` is
 * an id and resolving it wants a document, which the server render does not
 * have, so a legend ships empty and fills in on hydration. The table itself is
 * ordinary markup and is served whole, so nothing is missing from the page
 * before then, only from this list.
 *
 * The table is watched, because a legend that goes stale when its data changes
 * is a legend that has to be told, and nothing else in the page would know to
 * tell it.
 *
 * **Not hidden from a screen reader, though the mapping it draws is a color
 * one.** The argument for hiding it is real: the colours mean nothing to a
 * reader who cannot see them, and the names are already in the table. It stays
 * because the cost of being wrong runs one way. A duplicated list of three
 * words is noise; a consumer who took the table out of the accessibility tree
 * and then found the legend hidden too has a chart nobody can read, and neither
 * decision announces itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Key, Series Key
 * @documentation https://helix.fusion.dev/components/legend
 *
 * @csspart entry - One name and its swatch.
 * @csspart list - The list itself.
 * @csspart name - One series name.
 * @csspart swatch - The color a series is drawn in.
 */
@customElement('helix-base-legend')
export class HelixBaseLegend extends HelixElement {
  /**
   * Which way to read the table.
   *
   * Absent is `series`, one entry per data column. `categories` reads one entry
   * per body row instead, for a donut, whose slices are the rows.
   */
  @property({ reflect: true })
  entries?: 'categories' | 'series'

  /**
   * The id of the table to take the names from.
   *
   * Resolved through `getRootNode()`, so a legend inside another component's
   * shadow root names a table in that root rather than in the document.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  @property()
  for = ''

  /* One controller rather than the resolve-and-watch each chart had written
     out for itself. Three copies had already drifted into two names for the
     same lookup. */
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
    return this.entries === 'categories'
      ? (series[0]?.points.map((point) => point.label) ?? [])
      : series.map((one) => one.name)
  }

  protected override render(): TemplateResult {
    /* The index rather than the color, because a color is a token and the
       headless tier holds none. The styled tier maps one to the other, and it
       starts over after twenty-four.
     *
     * The palette is eight hues in three tones, so a legend of nine repeats the
     * first hue in a brighter tone rather than repeating a color outright. It
     * is still a hue collision and a chart with nine series has a worse problem
     * than the palette does; twenty-four is where it stops being able to help. */
    return html`<ul part="list" role="list">
      ${this.names().map(
        (name, index) => html`<li
          data-series=${(index % PALETTE) + 1}
          part="entry"
          style="--chart-series: var(--chart-series-${(index % PALETTE) + 1})"
          role="listitem"
        >
          <span aria-hidden="true" part="swatch"></span>
          <span part="name">${name}</span>
        </li>`,
      )}
    </ul>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-legend': HelixBaseLegend
  }
}
