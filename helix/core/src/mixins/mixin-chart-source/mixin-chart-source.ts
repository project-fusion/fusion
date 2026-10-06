import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { ChartPointerController } from '../../controllers/chart-pointer-controller/chart-pointer-controller.js'
import { SourceController } from '../../controllers/source-controller/source-controller.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { type Row, type Series, seriesKey } from '../../utils/read-series/read-series.js'
import { writtenList } from '../../utils/written-list/written-list.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * How many colors the series palette has, and so where it starts over.
 *
 * Here rather than in each chart, because a number two files have to agree on
 * is a number that will stop agreeing: when the palette went from eight to
 * twenty-four, one of five copies was missed and drew every ninth series in the
 * first color while the legend beside it named the ninth.
 */
export const PALETTE = 24

/** The palette slot for the nth series, counting from one and wrapping. */
export const seriesIndex = (depth: number): number => (depth % PALETTE) + 1

/**
 * The drawing's own coordinates, which a `viewBox` maps onto whatever box CSS
 * gives it.
 *
 * Here for the reason `PALETTE` is here, one paragraph up: six families drew
 * into the same square and declared it six times under three names, and one of
 * them wrote the same number as a literal on one axis and as its own constant
 * on the other, in one attribute. A round hundred so a `d` attribute is
 * readable in the inspector.
 *
 * **Two names for one number, because the axes are two facts.** `x2=${PLOT_WIDTH}`
 * and `y2=${PLOT_HEIGHT}` say which edge they reach; one name used twice says
 * nothing, and the day a chart is not square the call sites are already right.
 * `Sparkline` is that day already: it is a strip rather than a plot, so it takes
 * this width and states its own height beside it.
 */
export const PLOT_WIDTH = 100

/** The drawing's own coordinates. See `PLOT_WIDTH`. */
export const PLOT_HEIGHT = 100

/**
 * A list of series names, as the attributes that take one are written.
 *
 * **Here because five properties across two tiers read the same list and two of
 * them read it differently.** `BarChart.lines` and `secondary` split on
 * whitespace; `outlined`, `subtle` and `glass` on the styled tier split on
 * whitespace or a comma, under a sentence saying the first three are matched
 * "the way `lines` and `secondary` are". So `lines="Gateway, Billing"` looked
 * exactly like `outlined="Gateway, Billing"` and matched nothing, because
 * `gateway,` is not a column heading: no column drawn as a line, no error, and
 * nothing to read off the page that says why.
 *
 * `writtenList` is the split, and carries the argument for accepting a comma.
 * What this adds is `seriesKey`, the headings being matched
 * case-insensitively.
 */
export const seriesNames = (list: string | undefined): string[] => writtenList(list).map(seriesKey)

/**
 * The public surface `MixinChartSource` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private or protected members (TS4094), and every
 * class extending `HelixElement` inherits protected `willUpdate` and `updated`.
 * Returning the class directly was tried and refused for exactly that.
 *
 * **Every member here is documented twice, and that is the convention rather
 * than an oversight.** TypeScript reads this interface; the manifest reads the
 * inner class. Documented only here, the convention linter failed the build
 * with six `Public member has no description` on three charts that had just
 * been given a shared, fully documented property.
 *
 * **The protected members are declared here too, and have to be.** Cast to an
 * interface holding only `for` and `label`, `series` and `named` vanished from
 * the emitted `.d.ts` and every chart failed with `Property 'series' does not
 * exist`. A mixin's interface is not its public API, it is everything a
 * subclass can see.
 *
 * **The series palette, and the one property every chart's mark reads.** A
 * chart knows which series a bar belongs to and CSS cannot count it, so the
 * headless tier writes `--chart-series: var(--chart-series-3)` onto the
 * rectangle and each styled sheet is one rule rather than twenty-four.
 *
 * Declared here because this is where `seriesIndex` and `PALETTE` live, and
 * because a hook repeated on four families is a hook four families have to keep
 * agreeing about.
 *
 * The numbered twenty-four are the seam between the tiers: `chart/series.css`
 * points each at a semantic token, which is a decision and so belongs to the
 * styled tier, and a consumer on `headless` sets the same names to whatever
 * they like. The headless examples set them to a ramp of grays.
 *
 * @cssproperty --chart-series - The color of the mark it is set on. The component sets it, and the stylesheet reads it.
 * @cssproperty --chart-series-1 - The color of series 1. The styled tier points it at a palette token.
 * @cssproperty --chart-series-2 - The color of series 2. The styled tier points it at a palette token.
 * @cssproperty --chart-series-3 - The color of series 3. The styled tier points it at a palette token.
 * @cssproperty --chart-series-4 - The color of series 4. The styled tier points it at a palette token.
 * @cssproperty --chart-series-5 - The color of series 5. The styled tier points it at a palette token.
 * @cssproperty --chart-series-6 - The color of series 6. The styled tier points it at a palette token.
 * @cssproperty --chart-series-7 - The color of series 7. The styled tier points it at a palette token.
 * @cssproperty --chart-series-8 - The color of series 8. The styled tier points it at a palette token.
 * @cssproperty --chart-series-9 - The color of series 9. The styled tier points it at a palette token.
 * @cssproperty --chart-series-10 - The color of series 10. The styled tier points it at a palette token.
 * @cssproperty --chart-series-11 - The color of series 11. The styled tier points it at a palette token.
 * @cssproperty --chart-series-12 - The color of series 12. The styled tier points it at a palette token.
 * @cssproperty --chart-series-13 - The color of series 13. The styled tier points it at a palette token.
 * @cssproperty --chart-series-14 - The color of series 14. The styled tier points it at a palette token.
 * @cssproperty --chart-series-15 - The color of series 15. The styled tier points it at a palette token.
 * @cssproperty --chart-series-16 - The color of series 16. The styled tier points it at a palette token.
 * @cssproperty --chart-series-17 - The color of series 17. The styled tier points it at a palette token.
 * @cssproperty --chart-series-18 - The color of series 18. The styled tier points it at a palette token.
 * @cssproperty --chart-series-19 - The color of series 19. The styled tier points it at a palette token.
 * @cssproperty --chart-series-20 - The color of series 20. The styled tier points it at a palette token.
 * @cssproperty --chart-series-21 - The color of series 21. The styled tier points it at a palette token.
 * @cssproperty --chart-series-22 - The color of series 22. The styled tier points it at a palette token.
 * @cssproperty --chart-series-23 - The color of series 23. The styled tier points it at a palette token.
 * @cssproperty --chart-series-24 - The color of series 24. The styled tier points it at a palette token.
 */
export declare class MixinChartSourceInterface {
  /**
   * The id of the table to read.
   *
   * Names a table in the same tree, so a chart inside another component's
   * shadow root reads a table in that root rather than one in the document. A
   * `<table>` or anything built from grid roles, including `helix-table`.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  for: string
  /**
   * The chart's name, which starts the chart's text summary.
   *
   * Absent falls back to the table's own caption, which is usually the right
   * words and is already written.
   */
  label: string
  /**
   * The locale the chart's own numbers are written in: its axis, its
   * percentages and its totals, such as `de` for `1.240` and `32 %`.
   *
   * Absent uses the runtime's own. The table's cells are shown as the table
   * writes them, whatever this says.
   */
  locale: string
  /**
   * Where a reading the keys moved to stands among the readings, said after
   * it. `{position}` and `{count}` are replaced with the numbers, written in
   * `locale`.
   *
   * Set it to the words of the page's language, such as `{position} von
   * {count}`, or to nothing to say no position.
   */
  positionLabel: string
  /**
   * The table's columns, one series each. Empty when there is no table.
   */
  get series(): Series[]
  /**
   * The chart's name: an `aria-label` written on the chart, then `label`,
   * then the table's caption.
   */
  get named(): string
  /**
   * Every row of the table, with each cell's text and number.
   */
  get sourceRows(): Row[]
  /**
   * The positions of the cells in a row that hold numbers, in table order.
   */
  get plottedColumns(): number[]
  /**
   * The palette slot for the cell at this position in a row, or `undefined`
   * when no series was read from that column.
   */
  seriesOf(cell: number): number | undefined
  /**
   * Whether the series of this name is drawn, which it is unless a legend
   * reading the same table hid it.
   */
  showsSeries(name: string): boolean
  /**
   * Whether the series read from the cell at this place in a row is drawn,
   * by its column's heading. The keys and the readout pass over one a legend
   * hid.
   */
  showsColumn(cell: number): boolean
  /**
   * The number of readings, which the pointer position maps onto.
   */
  get readings(): number
  /**
   * Finds the reading nearest the pointer, so the tooltip can sit on it.
   */
  pointer: ChartPointerController
}

/**
 * The words a chart says a reading's place in by default, such as "2 of 12":
 * every chart's `position-label`, and Sparkline's, which is no chart source.
 * The property keeps the words written out, which is what its reference page
 * shows as the default; a spec holds the two together.
 */
export const POSITION_LABEL = '{position} of {count}'

/**
 * The half of a chart that is about finding its numbers rather than drawing.
 *
 * **A mixin rather than a controller**, by the rule the tier notes give: it
 * introduces `for` and `label`, which a consumer writes. `SourceController` is
 * the other half and stays a controller, because resolving an id and watching
 * for changes is behavior nobody calls.
 *
 * **`Legend` deliberately does not take this.** It reads a table and has no
 * drawing to title, so `label` would be API it never uses, and a mixin applied
 * for four fifths of a fit is how a shared thing starts drifting.
 */
export const MixinChartSource = <T extends Constructor<HelixElement>>(
  Base: T,
): T & Constructor<MixinChartSourceInterface> => {
  class ChartSourceElement extends Base {
    /** Resolves `for` and re-renders when the table behind it changes. */
    protected readonly source = new SourceController(this)

    /**
     * Finds the reading nearest the pointer, so the tooltip can sit on it.
     *
     * Public for the same reason `series` and `named` are: a protected member
     * cannot be cast onto across unrelated classes, so it would be invisible to
     * every chart that needs it. Reading where a pointer is resting is a fair
     * thing to ask a chart anyway.
     */
    readonly pointer = new ChartPointerController(this)

    /**
     * The id of the table to read.
     *
     * Names a table in the same tree, so a chart inside another component's
     * shadow root reads a table in that root rather than one in the document. A
     * `<table>` or anything built from grid roles, including `helix-table`.
     *
     * **In React this arrives as a property and not as an attribute**, the way
     * `Tooltip.for` does, so it does not reflect and nothing styles on it.
     */
    @property()
    for = ''

    /**
     * The chart's name, which starts the chart's text summary.
     *
     * Absent falls back to the table's own caption, which is usually the right
     * words and is already written.
     */
    @property()
    label = ''

    /**
     * The locale the chart's own numbers are written in: its axis, its
     * percentages and its totals, such as `de` for `1.240` and `32 %`.
     *
     * Absent uses the runtime's own. The table's cells are shown as the table
     * writes them, whatever this says.
     */
    @property()
    locale = ''

    /**
     * Where a reading the keys moved to stands among the readings, said after
     * it. `{position}` and `{count}` are replaced with the numbers, written in
     * `locale`.
     *
     * Set it to the words of the page's language, such as `{position} von
     * {count}`, or to nothing to say no position. A slice or a series a
     * legend hid is not counted.
     */
    @property({ attribute: 'position-label' })
    positionLabel = '{position} of {count}'

    /**
     * Hears an `aria-label` written on the chart, which no property mirrors,
     * so a page that names the chart that way names its plot.
     *
     * Lit observes the attributes of its own properties only, and `ariaLabel`
     * belongs to the platform.
     *
     * Read through `Reflect.get` with this class as the receiver, which is
     * what `super.observedAttributes` means: Lit's getter finalizes whichever
     * class it is asked on, and asked on the base it would finalize the base
     * and leave a subclass without its styles. A mixin's base has no static
     * side TypeScript can see, so `super` cannot be written here.
     */
    static get observedAttributes(): string[] {
      // biome-ignore lint/complexity/noThisInStatic: the receiver must be the subclass being defined, so a styled chart keeps its own attributes and styles, where the class name would read the base's
      const inherited = Reflect.get(Base, 'observedAttributes', this) as string[] | undefined
      return [...(inherited ?? []), 'aria-label']
    }

    /**
     * Called by the browser when an observed attribute changes. A new
     * `aria-label` asks for an update, because it names the plot.
     */
    override attributeChangedCallback(
      name: string,
      old: string | null,
      value: string | null,
    ): void {
      super.attributeChangedCallback(name, old, value)
      if (name === 'aria-label') {
        this.requestUpdate()
      }
    }

    /**
     * Re-resolves when the chart is pointed at a different table.
     *
     * `SourceController` watches whatever it resolved on connect, and nothing
     * tells it the id changed. Without this, pointing a chart at a second table
     * leaves it drawing the first, silently.
     */
    protected override willUpdate(changed: PropertyValues<this>): void {
      super.willUpdate(changed)
      if (changed.has('for')) {
        this.source.watch()
      }
    }

    /**
     * The table's columns, one series each. Empty when there is no table.
     *
     * Held by the controller between edits, so a render reading this five
     * times parses the table once. See `SourceController.series`.
     */
    get series(): Series[] {
      return this.source.series
    }

    /**
     * The chart's name: an `aria-label` written on the chart, then `label`,
     * then the table's caption.
     *
     * The fallback is the reason this is shared rather than copied: a caption is
     * already written, already the right words, and already the thing a reader
     * of the table sees. A chart that made the consumer say it twice would be
     * asking for the second one to drift.
     *
     * **An `aria-label` on the chart comes first**, because it is how a page
     * names an element, and the chart is a generic around its plot: written
     * on the host, the name reached nobody. The plot takes it, as Heatmap's
     * strip always did.
     */
    get named(): string {
      return (
        this.getAttribute?.('aria-label') ||
        this.label ||
        this.source.element?.querySelector('caption')?.textContent?.trim() ||
        ''
      )
    }

    /**
     * Every row of the table, with each cell's text and number.
     *
     * This is where a tooltip's content comes from, and it is deliberately not
     * `series`. A chart draws numbers; a reader resting a pointer on one wants
     * what the table says, which is `$128k` and not `128000`, and often wants
     * the column beside it that nothing plotted at all.
     *
     * **Not `rows`.** It is the source table's rows, and `rows` on a chart is a
     * name a chart wants for itself: `helix-heatmap` takes `rows="7"` to mean a
     * calendar week, and declaring that against a base class whose `rows` is a
     * `Row[]` getter is a type error at best. Name the member for what it holds
     * rather than for the shortest word available.
     */
    get sourceRows(): Row[] {
      return this.source.rows
    }

    /**
     * The positions of the cells in a row that hold numbers, in table order.
     *
     * The same test `readSeries` applies when it drops a column of notes: a
     * column is a series where any row parses, so a series survives one blank
     * cell and a column of words is never one.
     */
    get plottedColumns(): number[] {
      const rows = this.sourceRows
      const width = Math.max(0, ...rows.map((row) => row.cells.length))
      return Array.from({ length: width }, (_, column) => column).filter((column) =>
        rows.some((row) => row.cells[column]?.value !== undefined),
      )
    }

    /**
     * The palette slot for the cell at this position in a row.
     *
     * **A cell's place in its row is not its series' depth, and the tooltip
     * spent a while assuming it was.** `readSeries` drops a column nothing
     * parses and `readRows` keeps it, so one column of notes among the figures
     * moves every column after it one color along in the bubble: a row reading
     * `Referral 1,080` wearing series three's green beside a legend that says
     * series three is something else, which is the one failure the dot exists
     * to prevent.
     *
     * Overridden where a chart reads the table some other way. `ScatterChart`
     * splits the first plotted column off as the measure across, so its first
     * *plotted* series is this table's second numeric column.
     */
    seriesOf(cell: number): number | undefined {
      const depth = this.plottedColumns.indexOf(cell)
      return depth < 0 ? undefined : seriesIndex(depth)
    }

    /**
     * Whether the series of this name is drawn, which it is unless a legend
     * reading the same table hid it.
     *
     * Asked of the table rather than of a legend, the table being the one
     * thing the two share: see `SourceController.hide`. A series keeps its
     * palette slot while it is hidden, so the colors of the others do not move.
     * For a ring the names are its rows, the slices being the rows.
     */
    showsSeries(name: string): boolean {
      return !this.source.hidden.has(seriesKey(name))
    }

    /**
     * Whether the series read from the cell at this place in a row is drawn,
     * by its column's heading. The keys and the readout pass over one a
     * legend hid.
     *
     * A column's heading is the cell's name in every row, so the first row
     * answers for the column.
     */
    showsColumn(cell: number): boolean {
      const name = this.sourceRows[0]?.cells[cell]?.name
      return name === undefined || this.showsSeries(name)
    }

    /** The number of readings, which the pointer position maps onto. */
    get readings(): number {
      return this.sourceRows.length
    }
  }

  return ChartSourceElement as T & Constructor<MixinChartSourceInterface>
}
