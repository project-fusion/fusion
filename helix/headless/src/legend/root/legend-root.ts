import {
  customElement,
  focusItemOf,
  HelixElement,
  KeyboardNavigationController,
  requestValue,
  type Series,
  SourceController,
  seriesIndex,
  seriesKey,
  typeaheadBy,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { isHidden, namesIn, toggledNames } from '../hidden-series.js'

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
 * series is shown with `aria-pressed`. The buttons are a `toolbar`, named
 * as the list is, and one tab stop: the arrow keys move between them, Home
 * and End go to the first and the last, and a typed letter goes to the next
 * name starting with it.
 * `hidden-series` holds the hidden names,
 * so a page can start with some hidden or read which are. Two legends on one
 * table show the same hidden series: the list written last wins, and the
 * other legend takes it for its own entries.
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
 * @csspart list - The list of entries, a `toolbar` under `toggles`.
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
   * space. For a ring the names are the rows. An array of names set on the
   * property works too, as React sets `hiddenSeries={['Direct']}`; a toggle
   * writes the list back as a string.
   */
  @property({ attribute: 'hidden-series' })
  hiddenSeries: string | readonly string[] = ''

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

  /**
   * The toggle that holds the one tab stop, by place: the one a reader was
   * last on, or the first.
   */
  @state()
  private stop = 0

  /**
   * The arrow keys, Home, End and typed letters among the toggles, so a
   * legend of twelve series is one tab stop, as a toolbar of
   * toggle buttons is. Nothing without `toggles`, where there is nothing to
   * press.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () =>
      this.toggles
        ? [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[part="toggle"]')].map(
            (button) => focusItemOf(button, { words: button.textContent?.trim() ?? '' }),
          )
        : [],
    origin: 'focus',
    selects: () => false,
    typeahead: typeaheadBy((item) => (item as { words?: string }).words ?? ''),
  })

  /** The table this legend last wrote its `hidden-series` to, so leaving undoes it. */
  private wroteTo: Element | null = null

  /** Whether this update writes `hidden-series` to the table, decided before the render. */
  private writes = false

  /**
   * Decides who holds the hidden series for this update: this legend, or the
   * table.
   *
   * **This legend, where its own `hidden-series` moved**, by a press, by the
   * page, or by its first value, and where it has a list the table it now
   * reads has not had from it yet. **The table otherwise**, which is a second
   * legend on the same table having hidden something: this one takes the
   * table's list for its own entries and writes nothing back.
   *
   * Writing back on every update is what hung a page with two legends whose
   * lists differed: each write asks every reader of the table to update,
   * which included the other legend, which wrote its own list back. Now the
   * last list written wins and the other legend shows it, as two switches on
   * one lamp do.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.source.watch()
    }
    const table = this.source.element
    const asked =
      changed.has('hiddenSeries') &&
      !(changed.get('hiddenSeries') === undefined && namesIn(this.hiddenSeries).length === 0)
    this.writes =
      asked || (table !== null && table !== this.wroteTo && namesIn(this.hiddenSeries).length > 0)
    if (!this.writes && table !== null) {
      this.follow()
    }
  }

  /**
   * Takes the table's hidden series as this legend's own, for its entries.
   *
   * A name hidden on the table that is not one of this legend's entries stays
   * out of its list: a legend of the rows and one of the columns share a
   * table, and each keeps a list of its own.
   */
  private follow(): void {
    const hidden = this.source.hidden
    const now = namesIn(this.hiddenSeries)
    const next = this.names().filter((name) => hidden.has(seriesKey(name)))
    const same =
      next.length === now.length &&
      next.every((name) => now.some((one) => seriesKey(one) === seriesKey(name)))
    if (!same) {
      this.hiddenSeries = next.join(', ')
    }
  }

  /**
   * Hands `hidden-series` to the table, where every chart reading it finds
   * it.
   *
   * After the update rather than before, because a server has no table and a
   * hydrating render must draw what the server drew: the charts follow a frame
   * after the legend, which is when they draw at all. Only this legend's own
   * entries are written, so a series another legend hid among other names
   * stays hidden.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (this.writes) {
      this.writes = false
      this.wroteTo = this.source.hide(namesIn(this.hiddenSeries), this.names()) ?? this.wroteTo
    }
  }

  override disconnectedCallback(): void {
    /* A legend that leaves takes its hidden series with it, so a chart is not
       left drawing without a series nobody can show again. */
    if (this.wroteTo !== null) {
      this.source.hide([], this.names())
      this.wroteTo = null
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
    requestValue(this, toggledNames(this.hiddenSeries, name), (value) => {
      this.hiddenSeries = value
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
    const names = this.names()
    const stop = Math.min(this.stop, names.length - 1)
    /* **Toggles are a toolbar**, the role that says the arrows move among
       its buttons; a list of pressed buttons said nothing of the one tab
       stop. Its items then carry no role of their own. */
    const toolbar = this.toggles
    return html`<ul
      aria-label=${named || nothing}
      part="list"
      role=${toolbar ? 'toolbar' : 'list'}
    >
      ${names.map((name, index) => {
        const off = isHidden(this.hiddenSeries, name)
        return html`<li
          data-series=${seriesIndex(index)}
          part="entry${off ? ' entry-hidden' : ''}"
          style="--chart-series: var(--chart-series-${seriesIndex(index)})"
          role=${toolbar ? 'none' : 'listitem'}
        >
          ${this.renderSwatch(name, index)}${toolbar ? this.renderToggle(name, off, index, index === stop) : this.renderName(name, index)}
        </li>`
      })}
    </ul>`
  }

  /**
   * What an entry shows before its name, behind a seam a tier can fill.
   *
   * Nothing on this tier, which ships no CSS: the styled tier and a page draw
   * the swatch with `::part(entry)::before`, from the entry's `--chart-series`.
   * A tier that draws its swatch as an element, or a mark per series, returns
   * it here, and `index` says which palette slot the series takes.
   */
  protected renderSwatch(_name: string, _index: number): TemplateResult | typeof nothing {
    return nothing
  }

  /**
   * An entry's name, behind a seam a tier can move: a value beside the name,
   * or the name in other words. `index` is the series' place among the
   * entries. A toggle holds the same name inside its button.
   */
  protected renderName(name: string, _index: number): TemplateResult {
    return html`<span part="name">${name}</span>`
  }

  /**
   * The button around a name under `toggles`, behind a seam a tier can move.
   *
   * Pressed while its series is shown, which is the state a reader changes by
   * pressing it: a toggle button says whether its thing is on. `holds` says
   * whether it is the one tab stop, which is the last toggle a reader was on,
   * the toggle at `index`.
   */
  protected renderToggle(name: string, off: boolean, index = 0, holds = true): TemplateResult {
    return html`<button
      aria-pressed=${off ? 'false' : 'true'}
      part="toggle"
      tabindex=${holds ? '0' : '-1'}
      type="button"
      @click=${() => this.toggle(name)}
      @focus=${() => {
        this.stop = index
      }}
    >
      ${this.renderName(name, index)}
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-legend': HelixHeadlessLegend
  }
}
