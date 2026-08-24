import {
  type Curve,
  customElement,
  extent,
  HelixElement,
  linear,
  linePath,
  type Point,
  SourceController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The drawing's own coordinates, which the `viewBox` maps onto whatever box CSS
 * gives it. Round numbers so a `d` attribute is readable in the inspector.
 */
const BOX = { height: 32, width: 100 } as const

/** Splits on whitespace or commas, and keeps only what is a number. */
const readValues = (input: string): number[] =>
  input
    .split(/[\s,]+/)
    .filter((one) => one !== '')
    .map(Number)
    .filter((one) => Number.isFinite(one))

/**
 * @summary A line with no axes, for the shape of a series beside the number it belongs to.
 *
 * @description
 * The one chart here that takes its numbers from an attribute, and the reversal
 * is deliberate. Every other chart reads a table because a reader might want to
 * interrogate it; nobody interrogates the squiggle next to a figure. A
 * fourteen-row table behind a bare trend line is fourteen dates read aloud in
 * place of the one sentence that carries the meaning, so `values` is the list
 * and `label` is the sentence.
 *
 * That is the library's own rule rather than a second data channel: a content
 * property is its slot's fallback, which is why `Tooltip` takes `content` and
 * `Avatar` takes `name`. `for` stays for the sparkline that genuinely has a
 * table behind it, and it wins where both are given.
 *
 * **No label means decorative, and that is a choice rather than an oversight.**
 * A sparkline beside a stat that already says "Sessions, 1,102" has nothing of
 * its own to announce, and an unnamed `role="img"` announces "graphic" and
 * stops. So an unlabelled sparkline is `aria-hidden`, and a labeled one is an
 * image named by its sentence.
 *
 * It goes *beside* a `Stat` rather than inside one. The plan this was built
 * from called for a `trend` slot on `Stat`; the spec already on `Stat` says the
 * opposite, that a change beside a figure is a second fact, and the spec is
 * right. `Trend` composes the same way.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://helix.fusion.dev/components/sparkline
 *
 * @csspart area - The region between the line and the bottom of its range.
 * @csspart bar - One column, under `plot="bar"`.
 * @csspart line - The path itself.
 * @csspart svg - The drawing.
 * @csspart terminus - The mark on the last value.
 * @csspart wash-end - The far stop of the area's gradient.
 * @csspart wash-start - The stop of the area's gradient that meets the line.
 *
 * @cssproperty --chart-terminus-x - Where the last point sits horizontally, as a percentage.
 * @cssproperty --chart-terminus-y - Where the last point sits vertically, as a percentage.
 */
@customElement('helix-base-sparkline')
export class HelixBaseSparkline extends HelixElement {
  /**
   * What the readings are drawn as.
   *
   * Absent is a line, `area` is a line with the region beneath it washed, and
   * `bar` is a column per reading.
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
   * How the line gets from one reading to the next.
   *
   * **`smooth` is the resting curve.** *Changed 21 Aug 2026, reversing the
   * argument this comment used to make.* It read that joining the readings
   * claims nothing in between and is the default for that reason, which is true
   * and is why `straight` still exists: a straight segment asserts nothing about
   * the values between two readings, and a curve invents them.
   *
   * What settles it the other way is that the invention is bounded. The
   * interpolation is monotone cubic, so it never leaves the band the data sets
   * and never introduces a peak or a trough the series does not have. Within
   * that bound the smoothed line is the easier one to follow across a long
   * series, which is what the drawing is for. `straight` becomes the claim a
   * consumer makes deliberately rather than the one they get by saying nothing.
   *
   * **The property stays optional and the default lives in the render.** A
   * reflecting property with a default writes its attribute onto every host
   * anybody renders, including the ones nobody configured, which the SSR specs
   * assert against. So the resting state is still the attribute's absence, and
   * `curve ?? 'smooth'` is what reads it.
   *
   * `step` claims the opposite of both, that a reading holds until the next.
   * Bars ignore it, having no between to interpolate.
   */
  @property({ reflect: true })
  curve?: Curve

  /**
   * The id of a table to read instead, when there is one behind the line.
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
   * What the line says, in a sentence.
   *
   * "Sessions rose from 1,240 to 1,318 and fell to 1,102 over fourteen days" is
   * the accessible representation of a sparkline, and a list of the fourteen
   * numbers is not. Absent, the drawing is hidden from a screen reader rather
   * than announced without a name.
   */
  @property()
  label = ''

  /**
   * The numbers, separated by whitespace or by commas.
   *
   * Both separators, so `values="1240 1318"` and an array assigned to the
   * property both work: assigning `[1240, 1318]` stringifies to `1240,1318`,
   * and a string is what survives React's hydration where an array property
   * does not.
   */
  @property()
  values = ''

  /* One controller rather than the resolve-and-watch each chart had written
     out for itself. Three copies had already drifted into two names for the
     same lookup. */
  protected readonly source = new SourceController(this)

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.source.watch()
    }
  }

  /** The series to draw: the table if there is one, the attribute otherwise. */
  #points(): number[] {
    const series = this.source.series
    return series.length > 0
      ? (series[0]?.points.map((point) => point.value) ?? [])
      : readValues(this.values)
  }

  protected override render(): TemplateResult {
    const points = this.#points()
    /* Two points minimum, because one is not a trend and zero is not a line.
       An `<svg>` given a `d` of `M NaN,NaN` draws nothing and reports nothing,
       so the empty case is stated here rather than left to look like a bug. */
    const x = linear([0, Math.max(points.length - 1, 1)], [0, BOX.width])
    /* **A bar measures from zero and a line measures from its own range**, and
       that is a correctness difference rather than a preference.
     *
     * A line is a shape: what it says is where the readings sit relative to
     * each other, so running the scale over the data's own extent uses the
     * whole box and claims nothing about absolute size. A bar says something
     * else. Its *length* is the value, so a baseline anywhere but zero makes
     * the lengths proportional to nothing, which is the oldest misleading chart
     * there is.
     *
     * Drawn over the data's extent, the smallest reading landed exactly on the
     * floor and its column had no height at all: seven readings between 1,102
     * and 1,408 came out as six columns and a gap, which looks like missing
     * data and is really a scale saying the minimum is nothing.
     *
     * The zero is included at both ends, so a series that goes negative gets a
     * baseline inside the box and its columns hang below it. */
    const [low, high] = extent(points.length > 0 ? points : [0])
    const y =
      this.plot === 'bar'
        ? linear([Math.min(0, low), Math.max(0, high)], [BOX.height, 0])
        : linear([low, high], [BOX.height, 0])
    const coordinates: Point[] = points.map((value, index) => [x(index), y(value)])
    const path = this.plot === 'bar' ? '' : linePath(coordinates, this.curve ?? 'smooth')

    /* The same line closed down to the floor of its own range, which is where
       the wash goes. Its own path rather than a fill on the line, because a
       closed path strokes its closing edges too: filling the line itself would
       draw a rule along the bottom of the box and up both sides.
     *
     * The floor is the smallest reading and not a true zero, because the scale
     * runs over the data's own extent. That is the part a consumer would get
     * wrong writing this themselves, and it is why the shape is built here. */
    /* Asked negatively, because absent *is* an area here and the class doc
       above says why. This is the one property in the family where the resting
       arrangement is not the plainest thing, so the test has to answer true for
       the value nobody set, and `=== 'area'` would answer false. */
    const area =
      this.plot !== 'bar' && this.plot !== 'line' && path !== ''
        ? `${path}L${BOX.width},${BOX.height}L0,${BOX.height}Z`
        : ''

    /* One column per reading, inset so neighbours do not touch.
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
    const slot = BOX.width / Math.max(points.length, 1)
    const floor = y(0)
    const bars =
      this.plot === 'bar'
        ? points.map((value, index) => ({
            /* From the baseline to the reading, whichever of the two is
               higher up the box. A reading of exactly zero is a column of no
               height, which paints nothing, and that is the honest drawing of
               nothing rather than a hairline implying something. */
            height: Math.abs(floor - y(value)),
            width: slot * 0.72,
            x: index * slot + slot * 0.14,
            y: Math.min(floor, y(value)),
          }))
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
    const end =
      points.length < 2
        ? undefined
        : `--chart-terminus-x: 100%; --chart-terminus-y: ${
            (y(points[points.length - 1] as number) / BOX.height) * 100
          }%`

    return html`<svg
        aria-hidden=${this.label === '' ? 'true' : nothing}
        aria-label=${this.label === '' ? nothing : this.label}
        part="svg"
        preserveAspectRatio="none"
        role=${this.label === '' ? nothing : 'img'}
        style=${end ?? nothing}
        viewBox="0 0 ${BOX.width} ${BOX.height}"
      >
        ${
          /* The ramp the area is poured with, drawn here because a gradient is
             an element and elements are this tier's business, and coloured
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
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-sparkline': HelixBaseSparkline
  }
}
