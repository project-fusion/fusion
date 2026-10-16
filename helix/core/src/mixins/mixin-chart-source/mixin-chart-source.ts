import { speakerHigh } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { ChartPointerController } from '../../controllers/chart-pointer-controller/chart-pointer-controller.js'
import { SourceController } from '../../controllers/source-controller/source-controller.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { drawIcon } from '../../utils/draw-icon/draw-icon.js'
import { keyClaimed } from '../../utils/key-claimed/key-claimed.js'
import { timeConverter } from '../../utils/number-converter/number-converter.js'
import type { ChartData } from '../../utils/read-data/read-data.js'
import { type Row, type Series, seriesKey } from '../../utils/read-series/read-series.js'
import {
  ChartSound,
  panOf,
  pitchOf,
  type SoundSeries,
  sweepPlan,
} from '../../utils/sonify/sonify.js'
import { writtenList } from '../../utils/written-list/written-list.js'
import { formatWords, words } from '../../words/words.js'

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
   * The readings as data, in the shape of a table, where the page has no
   * table to point `for` at. `for` wins where both are set.
   */
  data: ChartData | undefined
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
   * Absent reads the nearest `lang`, then the runtime's own. The table's
   * cells are shown as the table writes them, whatever this says.
   */
  locale: string
  /**
   * The name of the button that shows the next page of readings in the table
   * drawn from `data`, which holds a page at a time past `READINGS_PAGE`.
   */
  nextReadingsLabel: string
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
   * The name of the button that shows the previous page of readings in the
   * table drawn from `data`.
   */
  previousReadingsLabel: string
  /**
   * Which readings the page of the table drawn from `data` holds, said beside
   * its buttons and as each page arrives. `{first}`, `{last}` and `{count}`
   * are replaced with the numbers, written in `locale`.
   */
  readingsLabel: string
  /**
   * Whether the readings have been looked for: false on the server and while
   * hydrating, where no table is resolved and no data is read.
   */
  get readingsKnown(): boolean
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
   * The heading of the column at this place in a row, read from the first row
   * that has a cell there, or `''` where none has.
   */
  columnName(cell: number): string
  /**
   * The number of readings, which the pointer position maps onto.
   */
  get readings(): number
  /**
   * Finds the reading nearest the pointer, so the tooltip can sit on it.
   */
  pointer: ChartPointerController
  /**
   * The readings as a table, for a screen reader, where they were drawn from
   * `data`: there is then no table on the page to read. Nothing otherwise.
   */
  protected renderTable(): TemplateResult | typeof nothing
  /**
   * Draws a Listen button that plays the chart as sound, and plays each
   * reading's tone as the arrow keys step to it. L plays it too while the
   * chart has focus, and Escape stops it.
   */
  listen: boolean
  /** How long each series takes to play, in milliseconds or as `3s`. */
  listenDuration: number
  /** The Listen button's words. */
  listenLabel: string
  /** The Listen button's words while the chart plays. */
  listenStopLabel: string
  /** Whether the chart is playing as sound now. */
  get sounding(): boolean
  /** `visible` draws the chart's text summary under it, as one line. */
  summary?: 'visible'
  /** Plays every shown series as sound, one after another, and resolves when it ends or is stopped. */
  playReadings(): Promise<void>
  /** Stops the sound. */
  stopReadings(): void
  /** The Listen button, under `listen`, behind a seam a chart places. */
  protected renderListen(): TemplateResult | typeof nothing
}

/**
 * How many readings the table drawn from `data` holds at once.
 *
 * **A table of every reading cost four elements a reading**, so a chart of
 * 10,000 readings built 40,000 nodes before its first frame and rebuilt them
 * on every new set of data, and a screen reader was handed a table it would
 * take an afternoon to read. Past this many the table holds a page of them,
 * says which, and takes buttons to the next and the previous page, which a
 * screen reader presses as it reads. The keys on the plot still walk every
 * reading.
 */
export const READINGS_PAGE = 200

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
    /**
     * The key `position-label` is registered under: the host's own, which
     * each chart names with its styled tag, `static words =
     * 'helix-line-chart'`. A host with none reads its tag name.
     */
    static words = ''

    /** Resolves `for` and re-renders when the table behind it changes. */
    protected readonly source = new SourceController(this)

    /**
     * @internal Finds the reading nearest the pointer, so the tooltip can sit
     * on it. Left out of the manifest: a page hears the reading through
     * `helix-reading-change`.
     *
     * Public for the same reason `series` and `named` are: a protected member
     * cannot be cast onto across unrelated classes, so it would be invisible to
     * every chart that needs it. Reading where a pointer is resting is a fair
     * thing to ask a chart anyway.
     */
    readonly pointer = new ChartPointerController(this)

    @state()
    private playingReadings = false

    private readonly sound = new ChartSound()

    /** The reading and series the last tone was played for. */
    private toned = { at: -1, series: -1 }

    /** Whether the chart is playing as sound now. */
    get sounding(): boolean {
      return this.playingReadings
    }

    /** Each shown series as sound: its name, and a value or nothing for each reading. */
    private soundSeries(): SoundSeries[] {
      const count = this.readings
      return this.series
        .filter((one) => this.showsSeries(one.name))
        .map((one) => {
          const values: Array<number | null> = Array.from({ length: count }, () => null)
          for (const point of one.points) {
            values[point.at] = point.value
          }
          return { name: one.name, values }
        })
    }

    /** The lowest and highest shown value, which the pitches span. */
    private soundRange(series: SoundSeries[]): { max: number; min: number } {
      const values = series.flatMap((one) =>
        one.values.filter((value): value is number => value !== null),
      )
      return { max: Math.max(...values, 0), min: Math.min(...values, 0) }
    }

    /** Plays every shown series as sound, one after another, and resolves when it ends or is stopped. */
    async playReadings(): Promise<void> {
      const series = this.soundSeries()
      if (series.length === 0) {
        return
      }
      this.playingReadings = true
      await this.sound.play(
        sweepPlan(series, { duration: this.listenDuration / 1000, ...this.soundRange(series) }),
      )
      this.playingReadings = false
    }

    /** Stops the sound. */
    stopReadings(): void {
      this.sound.stop()
      this.playingReadings = false
    }

    private readonly handleListenKey = (event: KeyboardEvent): void => {
      /* Escape stops the sound whatever else it does, the reading's own
         Escape included, which has already put the bubble away. */
      if (event.key === 'Escape' && this.playingReadings) {
        this.stopReadings()
        return
      }
      if (!this.listen || keyClaimed(event) || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }
      if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        if (this.playingReadings) {
          this.stopReadings()
        } else {
          void this.playReadings()
        }
      }
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.addEventListener('keydown', this.handleListenKey)
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.removeEventListener('keydown', this.handleListenKey)
      this.stopReadings()
    }

    protected override updated(changed: PropertyValues<this>): void {
      super.updated(changed)
      const { at, keyed, series } = this.pointer
      if (
        !this.listen ||
        !keyed ||
        at < 0 ||
        (at === this.toned.at && series === this.toned.series)
      ) {
        return
      }
      this.toned = { at, series }
      const all = this.soundSeries()
      const one = all[Math.max(0, series)]
      const value = one?.values[at]
      if (one === undefined || value === null || value === undefined) {
        return
      }
      const range = this.soundRange(all)
      void this.sound.play([
        {
          frequency: pitchOf(value, range.min, range.max),
          kind: 'tone',
          length: 0.18,
          pan: panOf(at, this.readings),
          series: Math.max(0, series),
          time: 0,
        },
      ])
    }

    protected renderListen(): TemplateResult | typeof nothing {
      if (!this.listen || !this.readingsKnown || !ChartSound.available) {
        return nothing
      }
      return html`<button
        part="listen"
        type="button"
        aria-pressed=${this.playingReadings ? 'true' : 'false'}
        @click=${() => {
          if (this.playingReadings) {
            this.stopReadings()
          } else {
            void this.playReadings()
          }
        }}
      >${drawIcon(speakerHigh)}<span>${this.playingReadings ? this.listenStopLabel : this.listenLabel}</span></button>`
    }

    /**
     * The readings as data, in the shape of a table, where the page has no
     * table to point `for` at. `for` wins where both are set.
     *
     * ```js
     * chart.data = {
     *   caption: 'Sessions by channel',
     *   columns: ['Month', 'Direct', 'Referral'],
     *   rows: [['Jan', 10, 4], ['Feb', 20, 8]],
     * }
     * ```
     *
     * The first column holds each row's label and every column after it a
     * series, as in a table. A cell is a number, words, `null` for a blank,
     * or `{ value, text }` for a number shown as words, such as `$128k`. A
     * number is shown in `locale`.
     *
     * **A table is still the better source where the page can show one**:
     * it reads with no script and before hydration, and a reader can sort and
     * copy it. Data is drawn on the client only, so a server serves the
     * frame, and the summary, the keys and the readout are then the whole of
     * what a screen reader is given. Set a new object to redraw: the chart
     * does not look inside the one it has.
     */
    @property({ attribute: false })
    data: ChartData | undefined = undefined

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
     * Draws a Listen button that plays the chart as sound: each series in
     * turn, its readings from left to right and from the left ear to the
     * right, the value as pitch over two octaves, a soft tick at each
     * gridline, and one timbre a series. With it, each reading the arrow keys
     * step to plays its tone beside what the readout says, and L plays the
     * whole chart while it has focus. Escape stops it. Nothing plays without a
     * press, and the sound is made only then.
     */
    @property({ reflect: true, type: Boolean })
    listen = false

    /** How long each series takes to play, in milliseconds or as `3s`. */
    @property({ attribute: 'listen-duration', converter: timeConverter('listen-duration', 3000) })
    listenDuration = 3000

    /** The Listen button's words. */
    @words
    @property({ attribute: 'listen-label' })
    listenLabel = 'Listen'

    /** The Listen button's words while the chart plays. */
    @words
    @property({ attribute: 'listen-stop-label' })
    listenStopLabel = 'Stop'

    /**
     * The locale the chart's own numbers are written in: its axis, its
     * percentages and its totals, such as `de` for `1.240` and `32 %`.
     *
     * Absent reads the nearest `lang`, then the runtime's own. The table's
     * cells are shown as the table writes them, whatever this says.
     */
    @property()
    locale = ''

    /**
     * The name of the button that shows the next page of readings in the
     * table drawn from `data`, which holds a page at a time past
     * `READINGS_PAGE`.
     */
    @words
    @property({ attribute: 'next-readings-label' })
    nextReadingsLabel = 'Next readings'

    /**
     * Where a reading the keys moved to stands among the readings, said after
     * it. `{position}` and `{count}` are replaced with the numbers, written in
     * `locale`.
     *
     * Set it to the words of the page's language, such as `{position} von
     * {count}`, or to nothing to say no position. A slice or a series a
     * legend hid is not counted.
     */
    @words
    @property({ attribute: 'position-label' })
    positionLabel = '{position} of {count}'

    /**
     * The name of the button that shows the previous page of readings in the
     * table drawn from `data`.
     */
    @words
    @property({ attribute: 'previous-readings-label' })
    previousReadingsLabel = 'Previous readings'

    /**
     * Which readings the page of the table drawn from `data` holds, said
     * beside its buttons and as each page arrives. `{first}`, `{last}` and
     * `{count}` are replaced with the numbers, written in `locale`.
     */
    @words
    @property({ attribute: 'readings-label' })
    readingsLabel = 'Readings {first} to {last} of {count}'

    /**
     * `visible` draws the chart's text summary under it, as one line. Absent,
     * the summary is said to a screen reader and drawn for no one else.
     */
    @property()
    summary?: 'visible'

    /** The page of the table drawn from `data` that is shown, counting from zero. */
    @state()
    private tablePage = 0

    /**
     * @internal Hears an `aria-label` written on the chart, which no property mirrors,
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
     * @internal Called by the browser when an observed attribute changes. A
     * new `aria-label` asks for an update, because it names the plot.
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
      const table = this.source.element
      return (
        this.getAttribute?.('aria-label') ||
        this.label ||
        table?.querySelector('caption')?.textContent?.trim() ||
        (table ? '' : this.data?.caption) ||
        ''
      )
    }

    /**
     * @internal Whether the readings have been looked for: false on the server
     * and while hydrating, where no table is resolved and no data is read. A
     * chart says it has no readings only once this is true.
     */
    get readingsKnown(): boolean {
      return this.source.known
    }

    /**
     * @internal Every row of the table, with each cell's text and number.
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
      if (this.plotted?.rows === rows) {
        return this.plotted.columns
      }
      let width = 0
      for (const row of rows) {
        width = Math.max(width, row.cells.length)
      }
      const columns = Array.from({ length: width }, (_, column) => column).filter((column) =>
        rows.some((row) => row.cells[column]?.value !== undefined),
      )
      this.plotted = { columns, rows }
      return columns
    }

    /**
     * The plotted columns, held against the rows they were read from: the
     * tooltip asks once for each of its cells and the keys once a press, and
     * each ask walked every row.
     */
    private plotted: { columns: number[]; rows: Row[] } | undefined

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

    /**
     * The heading of the column at this place in a row: a cell's name is its
     * column's heading, read from the first row that has a cell there, so a
     * short first row does not lose the heading. `''` where no row has one.
     */
    columnName(cell: number): string {
      return this.sourceRows.find((row) => row.cells[cell])?.cells[cell]?.name ?? ''
    }

    /** The number of readings, which the pointer position maps onto. */
    get readings(): number {
      return this.sourceRows.length
    }

    /**
     * The readings as a table, for a screen reader, where they were drawn from
     * `data`: there is then no table on the page to read, and a chart's
     * summary gives only what the readings come to. Nothing where a table on
     * the page was read, which is already the readable version.
     *
     * The `table` part, named by the chart, its cells as `data` writes them.
     *
     * **Past `READINGS_PAGE` readings it holds a page of them**, which is the
     * window a virtualized grid gives a screen reader: `aria-rowcount` says how
     * many rows there are and each row's `aria-rowindex` says where it stands,
     * so a reader hears "row 4,021 of 10,001". A hidden table has no scroll to
     * move its window, so the `table-pages` part after it says which readings
     * the page holds and takes two buttons to turn it. They are left out of
     * the tab order, the plot being the chart's one stop and the buttons
     * having nothing to show a sighted reader, and a screen reader presses
     * them where it reads them.
     */
    protected renderTable(): TemplateResult | typeof nothing {
      const rows = this.sourceRows
      if (this.source.element || rows.length === 0) {
        return nothing
      }
      let width = 0
      for (const row of rows) {
        width = Math.max(width, row.cells.length)
      }
      const columns = Array.from({ length: width }, (_, cell) => this.columnName(cell))
      const pages = Math.ceil(rows.length / READINGS_PAGE)
      const page = Math.min(this.tablePage, pages - 1)
      const first = page * READINGS_PAGE
      const shown = rows.slice(first, first + READINGS_PAGE)
      const paged = pages > 1
      return html`<table
        aria-describedby=${paged ? 'helix-chart-readings' : nothing}
        aria-rowcount=${paged ? rows.length + 1 : nothing}
        part="table"
      >
        ${this.named ? html`<caption>${this.named}</caption>` : nothing}
        <thead><tr aria-rowindex=${paged ? 1 : nothing}><th scope="col">${this.data?.columns[0] ?? ''}</th>${columns.map((name) => html`<th scope="col">${name}</th>`)}</tr></thead>
        <tbody>${shown.map(
          (row, place) =>
            html`<tr aria-rowindex=${paged ? first + place + 2 : nothing}><th scope="row">${row.label}</th>${columns.map((_, cell) => html`<td>${row.cells[cell]?.text ?? ''}</td>`)}</tr>`,
        )}</tbody>
      </table>${paged ? this.renderTablePages(page, pages, first, shown.length, rows.length) : nothing}`
    }

    /**
     * Which readings the table's page holds, and the buttons that turn it:
     * the `table-pages` part, after the table, where a reader who reaches the
     * end of a page finds the next.
     *
     * The words are a polite live region, so a reader who presses a button
     * hears which readings arrived. A button at either end stays where it is
     * and says it is unavailable, so the focus a press put on it is not lost.
     */
    private renderTablePages(
      page: number,
      pages: number,
      first: number,
      shown: number,
      count: number,
    ): TemplateResult {
      const turn = (by: number) => (): void => {
        const next = Math.min(Math.max(page + by, 0), pages - 1)
        if (next !== page) {
          this.tablePage = next
        }
      }
      return html`<div part="table-pages">
        <span id="helix-chart-readings" role="status">${formatWords(this, 'readingsLabel', {
          count,
          first: first + 1,
          last: first + shown,
        })}</span>
        <button
          aria-disabled=${page === 0 ? 'true' : 'false'}
          tabindex="-1"
          type="button"
          @click=${turn(-1)}
        >${this.previousReadingsLabel}</button>
        <button
          aria-disabled=${page === pages - 1 ? 'true' : 'false'}
          tabindex="-1"
          type="button"
          @click=${turn(1)}
        >${this.nextReadingsLabel}</button>
      </div>`
    }
  }

  return ChartSourceElement as unknown as T & Constructor<MixinChartSourceInterface>
}
