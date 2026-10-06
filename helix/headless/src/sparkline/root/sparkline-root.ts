import {
  CHART_PLOT,
  ChartPointerController,
  type Curve,
  customElement,
  extent,
  formatNumbers,
  HelixElement,
  linear,
  linePath,
  PLOT_WIDTH,
  type Point,
  type Series,
  SourceController,
  unbroken,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { areaPath, extremesOf, overviewWords, readingWords, slotsOf } from '../readings.js'

/**
 * How tall the strip is drawn, which is the one coordinate this family states.
 *
 * A sparkline is a line beside a number rather than a plot, so it is the one
 * drawing here that is not square: the width is `PLOT_WIDTH` like every other
 * chart's, and this is 32 against that 100.
 */
const STRIP_HEIGHT = 32

/**
 * @summary A small chart with no axes that shows the shape of a series beside its number.
 *
 * @description
 * Takes its numbers from the `values` attribute. The other charts read a table,
 * but a table behind a small trend line would be read aloud row by row. Set
 * `values` to the data and `label` to the one sentence a screen reader
 * announces.
 *
 * Use `for` when a sparkline has a real table behind it. `for` wins when both
 * are set.
 *
 * Without a `label` the sparkline is decorative and `aria-hidden`, for example
 * beside a stat that already says "Sessions, 1,102". With a `label` it is
 * named by that sentence and read by key, as every chart is: the drawing takes
 * focus, the arrow keys walk the readings, Home and End go to the first and
 * the last, Escape puts the reading away, and the `live` part says each
 * reading with where it stands, such as "Mon: 12 (3 of 7)".
 *
 * **A named sparkline describes itself.** Beside its name, a screen reader
 * hears what the readings come to, the first and the last, the highest and
 * the lowest, in `overview-label`: "From 12 to 20, highest 30, lowest 8". An
 * `aria-label` on the element names it as `label` does.
 *
 * A pointer resting on the drawing shows the reading under it: the `cursor`
 * part marks it and the `readout` part writes it. `marks` adds a mark on the
 * highest and the lowest reading, and `range` draws a band between two values,
 * such as a normal range. A blank cell in a `for` table is a gap in the line,
 * and a reading alone between two blanks is a `lone` mark.
 *
 * Place it beside a `Stat`, because a change beside a figure is a second fact,
 * as `Stat`'s own spec says. `Trend` is composed the same way.
 *
 * The component writes the properties listed below, and the stylesheet that
 * draws the sparkline reads them. Do not set them yourself. They carry numbers
 * the component computes and CSS cannot, so a stylesheet can draw the sparkline
 * without measuring anything.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://fusion.dev/helix/components/sparkline
 *
 * @csspart area - The region between the line and the bottom of its range.
 * @csspart bar - One column, drawn when `plot="bar"`.
 * @csspart cursor - The mark on the reading a pointer or a key rests on, rendered only while there is one. Placed with `inset-inline-start` and `inset-block-start`.
 * @csspart high - The mark on the highest reading, under `marks="high"`. Placed as `cursor` is.
 * @csspart line - The line's path.
 * @csspart live - A polite region that says the reading a key moved to, rendered only with a `label`. Hide it visually.
 * @csspart lone - The mark on a reading no line reaches, with a blank or an end on each side. Placed as `cursor` is.
 * @csspart low - The mark on the lowest reading, under `marks="low"`. Placed as `cursor` is.
 * @csspart overview - What the readings come to, in `overview-label`, which describes the drawing. Rendered `hidden` with a name, since it is read through the description and not shown.
 * @csspart range - The band between the two values of `range`, drawn behind the line.
 * @csspart readout - The reading a pointer or a key rests on, as the table or `values` writes it, rendered only while there is one. Placed as `cursor` is.
 * @csspart svg - The drawing, which takes focus to be read by key where there is a `label`.
 * @csspart terminus - The mark on the last value.
 * @csspart wash-end - The far stop of the area's gradient.
 * @csspart wash-start - The stop of the area's gradient that meets the line.
 *
 * @cssproperty --chart-terminus-x - Where the last point sits horizontally, as a percentage.
 * @cssproperty --chart-terminus-y - Where the last point sits vertically, as a percentage.
 */
@customElement('helix-headless-sparkline')
export class HelixHeadlessSparkline extends HelixElement {
  /**
   * How the line is drawn from one reading to the next.
   *
   * **`smooth` is the resting curve.** A straight segment asserts nothing about
   * the values between two readings and a curve invents them, which is why
   * `straight` exists. What settles the default the other way is that the
   * invention is bounded: the interpolation is monotone cubic, so it never
   * leaves the band the data sets and never introduces a peak or a trough the
   * series does not have. Within that bound the smoothed line is the easier one
   * to follow across a long series, which is what the drawing is for. `straight`
   * becomes the claim a consumer makes deliberately rather than the one they get
   * by saying nothing.
   *
   * **The property stays optional and the default lives in the render.** A
   * reflecting property with a default writes its attribute onto every host
   * anybody renders, including the ones nobody configured, which the SSR specs
   * assert against. So the resting state is still the attribute's absence, and
   * `curve ?? 'smooth'` is what reads it.
   *
   * `step` claims the opposite of both, that a reading holds until the next.
   * Bars ignore it, having no between to interpolate.
   *
   * **`AreaChart` rests at `straight` and is not disagreeing.** A line claims a
   * position and a stacked band claims an amount: a curve fitted through one
   * sum can pass under the curve fitted through the sum beneath it, so a
   * smoothed stack can draw a part as less than nothing. There is no such edge
   * here, which is what lets a line take the reading aid.
   */
  @property({ reflect: true })
  curve?: Curve

  /**
   * The id of a table to read the readings from, when a table holds the data.
   *
   * The first column of numbers is the series drawn. This wins over `values`,
   * because a table is the readable representation and a list of numbers in an
   * attribute is not.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  @property()
  for = ''

  /**
   * A sentence that describes what the line shows.
   *
   * "Sessions rose from 1,240 to 1,318 and fell to 1,102 over fourteen days" is
   * the accessible representation of a sparkline, and a list of the fourteen
   * numbers is not. Absent, the drawing is hidden from a screen reader rather
   * than announced without a name.
   */
  @property()
  label = ''

  /**
   * The locale the readout's numbers and positions are written in, such as
   * `de` for `1.240`.
   *
   * Absent uses the runtime's own. A table's cells are shown as the table
   * writes them, whatever this says.
   */
  @property()
  locale = ''

  /**
   * Which readings take a mark of their own: `high`, `low`, or both,
   * separated by spaces.
   *
   * Absent marks none, and the drawing is what it was. Each mark is a part,
   * placed at its reading, for a stylesheet to draw.
   */
  @property()
  marks = ''

  /**
   * What the readings come to, said after the name: `{first}` and `{last}`
   * for the first and the last reading, `{high}` and `{low}` for the highest
   * and the lowest, each written as the readout writes it.
   *
   * Set it to the words of the page's language, or to nothing to say no
   * more than the name. Said only where the sparkline is named.
   */
  @property({ attribute: 'overview-label' })
  overviewLabel = 'From {first} to {last}, highest {high}, lowest {low}'

  /**
   * What the readings are drawn as.
   *
   * Absent is `area`, a line with the region beneath it washed. `line` is the
   * bare stroke, and `bar` is a column per reading.
   *
   * **A bar plot measures from zero and the other two measure from the data's
   * own range**, which is the one way the plots are not interchangeable. A line
   * says where the readings sit relative to each other, so a scale over their
   * extent uses the whole box and claims nothing about absolute size. A bar's
   * length *is* the value, so any baseline but zero makes the lengths
   * proportional to nothing.
   *
   * **Which is a reason to prefer a line for readings in a narrow band far from
   * zero.** Seven values between 1,102 and 1,408 drawn as columns from zero are
   * seven columns of nearly the same height, and that is the true picture: they
   * *are* nearly the same. The same readings as a line fill the box and show
   * the movement, because a line is only ever claiming a shape.
   *
   * **Absent is `area`**, which is the departure from the rule that a resting
   * arrangement is the plainest thing. At the size a sparkline is actually
   * drawn, a hairline in a wide box is mostly box: the wash under it is what
   * gives the shape a body and lets a reader see it at a glance rather than
   * hunting for it, which is the entire job. `line` is the bare stroke for
   * anywhere the fill would be noise, several of them in one box for instance.
   *
   * This tier rather than the one above: a plot type is geometry and geometry
   * is markup, the same reason `curve` lives here.
   */
  @property({ reflect: true })
  plot?: 'area' | 'bar' | 'line'

  /**
   * Where a reading the keys moved to stands among the readings, said after
   * it. `{position}` and `{count}` are replaced with the numbers, written in
   * `locale`.
   *
   * Set it to the words of the page's language, such as `{position} von
   * {count}`, or to nothing to say no position.
   */
  @property({ attribute: 'position-label' })
  positionLabel = '{position} of {count}'

  /**
   * Two values a band is drawn between, behind the line, separated by a
   * space: `range="60 100"` marks a normal range.
   *
   * The scale stretches to hold the band where the readings do not reach it.
   * Absent draws none.
   */
  @property()
  range = ''

  /**
   * The numbers, separated by whitespace or by commas.
   *
   * An array assigned to the property works too, which is what React 19 does
   * with `values={[1240, 1318]}`. The attribute is the form to prefer, because
   * a string is what survives React's hydration where an array property does
   * not.
   */
  @property()
  values: string | readonly number[] = ''

  /* One controller rather than the resolve-and-watch each chart had written
     out for itself. */
  protected readonly source = new SourceController(this)

  /**
   * Finds the reading a pointer or a key rests on, as it does for every
   * chart, so a sparkline is read the way they are.
   */
  readonly pointer = new ChartPointerController(this)

  /**
   * Hears an `aria-label` written on the sparkline, which no property mirrors,
   * because it names the drawing as `label` does, as on every chart.
   */
  static override get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: super runs Lit's getter with the subclass as this, so a styled sparkline keeps its own attributes
    return [...super.observedAttributes, 'aria-label']
  }

  /** Called by the browser when an observed attribute changes; a new `aria-label` renames the drawing. */
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value)
    if (name === 'aria-label') {
      this.requestUpdate()
    }
  }

  /** The drawing's name: an `aria-label` written on the sparkline, then `label`. */
  get named(): string {
    return this.getAttribute?.('aria-label') || this.label
  }

  /** The two values of `range`, lower first, or none. */
  private get band(): [number, number] | undefined {
    const [one, two] = writtenNumbers(this.range)
    return one === undefined || two === undefined
      ? undefined
      : [Math.min(one, two), Math.max(one, two)]
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.source.watch()
    }
  }

  /**
   * The series to draw, and how many readings it has room for: the table's
   * first series over the table's rows if there is one, the attribute
   * otherwise.
   *
   * Over the rows, so a blank cell is a reading with nothing in it and the
   * line breaks there, as `LineChart` draws one. Joined across, the line
   * claimed a value the table does not have.
   */
  private drawn(): { count: number; series: Series } {
    const read = this.source.series
    if (read.length > 0) {
      return {
        count: this.source.rows.length,
        series: read[0] ?? { name: '', points: [] },
      }
    }
    const values = writtenNumbers(this.values)
    return {
      count: values.length,
      series: { name: '', points: values.map((value, at) => ({ at, label: '', value })) },
    }
  }

  /** How many readings there are, which the pointer and the keys walk. */
  get readings(): number {
    return this.drawn().count
  }

  /**
   * The reading at a place, in words: the table's cell as it is written, or
   * the number in `locale`, after the row's name where a table gave one.
   */
  private reading(at: number, value: number | undefined): { label: string; text: string } {
    const rows = this.source.rows
    const row = rows[at]
    if (!row) {
      return { label: '', text: value === undefined ? '' : formatNumbers(this.locale)(value) }
    }
    /* The first column any row holds a number in, which is the one
       `readSeries` drew first. */
    const column = row.cells.findIndex((_, index) =>
      rows.some((one) => one.cells[index]?.value !== undefined),
    )
    return { label: row.label, text: row.cells[column]?.text ?? '' }
  }

  protected override render(): TemplateResult {
    const { count, series } = this.drawn()
    const slots = slotsOf(series.points, count)
    const points = slots.filter((value): value is number => value !== undefined)
    const band = this.band
    /* Two points minimum, because one is not a trend and zero is not a line.
       An `<svg>` given a `d` of `M NaN,NaN` draws nothing and reports nothing,
       so the empty case is stated here rather than left to look like a bug. */
    const x = linear([0, Math.max(count - 1, 1)], [0, PLOT_WIDTH])
    /* **A bar measures from zero and a line measures from its own range**, and
       that is a correctness difference rather than a preference. A bar's
       *length* is the value, so a baseline anywhere but zero makes the lengths
       proportional to nothing. Drawn over the data's extent, the smallest
       reading lands exactly on the floor and its column has no height at all:
       seven readings between 1,102 and 1,408 come out as six columns and a gap,
       which looks like missing data and is really a scale saying the minimum is
       nothing.

       The zero is included at both ends, so a series that goes negative gets a
       baseline inside the box and its columns hang below it. */
    const [low, high] = extent(points.length > 0 ? [...points, ...(band ?? [])] : [0])
    const y =
      this.plot === 'bar'
        ? linear([Math.min(0, low), Math.max(0, high)], [STRIP_HEIGHT, 0])
        : linear([low, high], [STRIP_HEIGHT, 0])
    /* One path per unbroken run, so a blank reading is a gap in the line. A series with no blank is one run, and draws what it did. */
    const runs =
      this.plot === 'bar'
        ? []
        : unbroken(series)
            .map((run) => run.map((point): Point => [x(point.at), y(point.value)]))
            .map((run) => ({ path: linePath(run, this.curve ?? 'smooth'), run }))
            .filter((one) => one.path !== '')
    const path = runs.map((one) => one.path).join('')

    /* The same line closed down to the floor of its own range, which is where
       the wash goes. Its own path rather than a fill on the line, because a
       closed path strokes its closing edges too: filling the line itself would
       draw a rule along the bottom of the box and up both sides.

       The floor is the smallest reading and not a true zero, because the scale
       runs over the data's own extent. */
    /* Asked negatively, because absent *is* an area here and the class doc
       above says why. This is the one property in the family where the resting
       arrangement is not the plainest thing, so the test has to answer true for
       the value nobody set, and `=== 'area'` would answer false. */
    const area =
      this.plot !== 'bar' && this.plot !== 'line' && path !== '' ? areaPath(runs, STRIP_HEIGHT) : ''

    /* One column per reading, inset so neighbors do not touch.
     *
     * A rect rather than a thick stroked line, because a bar has two ends and a
     * stroke has a cap: `stroke-linecap` would round or square both ends of
     * every column together, and the floor end should always be flat.
     *
     * The width is a share of the slot rather than a fixed number, so a series
     * of seven and a series of forty both fill the box. Fourteen percent of the
     * gap is the smallest separation that still reads as separate columns at
     * the sizes a sparkline is drawn at, and it comes off the slot rather than
     * off the bar so a two-reading series does not get two enormous slabs. */
    const slot = PLOT_WIDTH / Math.max(count, 1)
    const floor = y(0)
    const bars =
      this.plot === 'bar'
        ? slots.flatMap((value, index) =>
            value === undefined
              ? []
              : [
                  {
                    /* From the baseline to the reading, whichever of the two is
               higher up the box. A reading of exactly zero is a column of no
               height, which paints nothing, and that is the honest drawing of
               nothing rather than a hairline implying something. */
                    height: Math.abs(floor - y(value)),
                    width: slot * 0.72,
                    x: index * slot + slot * 0.14,
                    y: Math.min(floor, y(value)),
                  },
                ],
          )
        : []

    /* Where the series ended, as percentages of the box.
     *
     * Read twice, by the mark and by the drawing, which is why it is a local
     * rather than two literals. The mark sits on it; the drawing has the same
     * disc taken out of it, so a `ring` is a hole rather than a lid. A custom
     * property would be the tidier channel and there is nowhere to put one:
     * they inherit down and never sideways, the two elements are siblings, and
     * the host cannot be styled from a template without a wrapper element that
     * carries nothing else. */
    const lastAt = slots.findLastIndex((value) => value !== undefined)
    const end =
      points.length < 2
        ? undefined
        : `--chart-terminus-x: ${(x(lastAt) / PLOT_WIDTH) * 100}%; --chart-terminus-y: ${
            (y(slots[lastAt] as number) / STRIP_HEIGHT) * 100
          }%`
    /* Where a reading stands in the box, as percentages from the inline start
       and the top: on the line for a line, and on the top of its column for a
       bar. */
    const at = (index: number, value: number): string => {
      const across = this.plot === 'bar' ? index * slot + slot / 2 : x(index)
      return `inset-inline-start: ${(across / PLOT_WIDTH) * 100}%; inset-block-start: ${
        (y(value) / STRIP_HEIGHT) * 100
      }%`
    }
    const name = this.named
    const named = name !== ''
    const overview = named
      ? overviewWords(this.overviewLabel, slots, (index) => this.reading(index, slots[index]).text)
      : ''

    /* **Named, the drawing is read by key**, as every chart's plot is: an
       `application` so a screen reader passes the arrows through, one tab
       stop, the readings walked by `pointer`. Decorative, it is hidden and
       takes no stop. */
    return html`<svg
        aria-describedby=${overview === '' ? nothing : 'sparkline-overview'}
        aria-hidden=${named ? nothing : 'true'}
        aria-label=${named ? name : nothing}
        data-mirror
        id=${CHART_PLOT}
        part="svg"
        preserveAspectRatio="none"
        role=${named ? (points.length > 0 ? 'application' : 'img') : nothing}
        style=${end ?? nothing}
        tabindex=${named && points.length > 0 ? '0' : nothing}
        viewBox="0 0 ${PLOT_WIDTH} ${STRIP_HEIGHT}"
      >
        ${
          /* The ramp the area is poured with, drawn here because a gradient is
             an element and elements are this tier's business, and colored
             above because a color is not. Measured rather than assumed: a
             fragment id inside a shadow root resolves within that root, so two
             sparklines on a page carrying the same id stay independent, and CSS
             `fill: url(#...)` reaches it as readily as the attribute does. */
          svg`<defs>
            <linearGradient id="sparkline-wash" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" part="wash-start" />
              <stop offset="1" part="wash-end" />
            </linearGradient>
          </defs>`
        }
        ${
          band === undefined
            ? nothing
            : svg`<rect
                height=${Math.abs(y(band[0]) - y(band[1]))}
                part="range"
                width=${PLOT_WIDTH}
                x="0"
                y=${Math.min(y(band[0]), y(band[1]))}
              />`
        }
        ${
          /* `svg` and not `html`, because a nested template is parsed on its
             own and this one has no `<svg>` around it to be parsed inside.
             `<path>` read as standalone HTML becomes an unknown element in the
             XHTML namespace: it takes the part, takes the `d`, inherits the
             stroke, and draws nothing at all, because only an element in the
             SVG namespace has geometry. Measured by `getBBox` throwing, which
             is the shortest way to ask an element whether it is really SVG.

             Every spec written against this passed while it drew nothing. They
             asserted the `d` attribute, the part, the ARIA and the computed
             `vector-effect`, and all of those are true of an HTML element
             wearing the same name. */
          path === '' ? nothing : svg`<path d=${path} part="line" />`
        }
        ${area === '' ? nothing : svg`<path d=${area} part="area" />`}
        ${bars.map(
          (bar) =>
            svg`<rect
              height=${bar.height}
              part="bar"
              width=${bar.width}
              x=${bar.x}
              y=${bar.y}
            />`,
        )}
      </svg>
      ${
        /* The mark on the last value, as an element beside the drawing rather
           than a `<circle>` inside it. `preserveAspectRatio="none"` is what lets
           the line fill any box, and it distorts everything in that coordinate
           space with it: a circle in there is an ellipse whose squash depends on
           how wide the consumer made it. Percentages of the host are the same
           two numbers in a space nothing stretches. */
        /* A line ends somewhere and a row of columns does not, so a bar plot
           draws no terminus: the last column already is the last reading, and a
           dot on top of it would be a second mark saying the same thing. */
        points.length < 2 || this.plot === 'bar'
          ? nothing
          : html`<span aria-hidden="true" part="terminus" style=${end ?? nothing}></span>`
      }${this.renderLone(points.length < 2 ? undefined : series, at)}${this.renderMarks(slots, at)}${this.renderReading(slots, at)}${
        named && count > 0 ? this.renderLive(slots) : nothing
      }${
        overview === ''
          ? nothing
          : html`<span hidden id="sparkline-overview" part="overview">${overview}</span>`
      }`
  }

  /**
   * A mark on each reading with a blank on either side, which no line can
   * reach, so a line and an area show it as `LineChart` does. Not on a bar
   * plot, whose column already shows it.
   */
  protected renderLone(
    series: Series | undefined,
    at: (index: number, value: number) => string,
  ): TemplateResult | typeof nothing {
    if (!series || this.plot === 'bar') {
      return nothing
    }
    const alone = unbroken(series).filter((run) => run.length === 1)
    return alone.length === 0
      ? nothing
      : html`${alone.map(
          ([point]) =>
            html`<span aria-hidden="true" part="lone" style=${at(point?.at ?? 0, point?.value ?? 0)}></span>`,
        )}`
  }

  /** The marks `marks` asks for, on the highest and the lowest reading. */
  protected renderMarks(
    slots: (number | undefined)[],
    at: (index: number, value: number) => string,
  ): TemplateResult | typeof nothing {
    const asked = writtenList(this.marks)
    if (asked.length === 0) {
      return nothing
    }
    const found = extremesOf(slots)
    const place = (index: number | undefined, name: 'high' | 'low'): string | undefined =>
      asked.includes(name) && index !== undefined ? at(index, slots[index] as number) : undefined
    const high = place(found.high, 'high')
    const low = place(found.low, 'low')
    return html`${high === undefined ? nothing : html`<span aria-hidden="true" part="high" style=${high}></span>`}${
      low === undefined ? nothing : html`<span aria-hidden="true" part="low" style=${low}></span>`
    }`
  }

  /**
   * The reading a pointer or a key rests on: a mark on it and its words
   * beside it. Hidden from a screen reader, which hears the `live` part.
   */
  protected renderReading(
    slots: (number | undefined)[],
    at: (index: number, value: number) => string,
  ): TemplateResult | typeof nothing {
    const index = this.pointer.at
    const value = slots[index]
    if (index < 0 || value === undefined) {
      return nothing
    }
    const { label, text } = this.reading(index, value)
    const place = at(index, value)
    return html`<span aria-hidden="true" part="cursor" style=${place}></span
      ><span aria-hidden="true" part="readout" style=${place}
        >${readingWords(label, text, '')}</span
      >`
  }

  /**
   * The polite region that says a reading the keys moved to, in words and
   * with where it stands. Rendered from the first drawing and empty until a
   * key moves the reading, so it is heard when its words change.
   */
  protected renderLive(slots: (number | undefined)[]): TemplateResult {
    const index = this.pointer.at
    const said = this.pointer.keyed && index >= 0 ? this.reading(index, slots[index]) : undefined
    return html`<span aria-live="polite" part="live" role="status"
      >${said ? readingWords(said.label, said.text, this.pointer.position) : ''}</span
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-sparkline': HelixHeadlessSparkline
  }
}
