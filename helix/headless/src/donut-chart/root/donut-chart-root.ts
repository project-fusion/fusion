import {
  CHART_PLOT,
  customElement,
  drawTooltip,
  HelixElement,
  MixinChartSource,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  seriesIndex,
} from '@fusion.dev/helix-core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/* Square, because the shape has to stay round: the plot box is already one and
   this is the center of it. */
const CENTER = PLOT_WIDTH / 2

/** The outer edge of the ring, whatever its thickness. */
const EDGE = 40

/**
 * The dash gap, long enough that the pattern cannot repeat.
 *
 * A dash array tiles. Set to `circumference - length` the pattern fills the
 * circle exactly once and is right at rest, and wrong the moment it animates:
 * both numbers interpolate, and while the gap is shorter than the path still to
 * cover, a second and third copy of the slice sweep round the ring and vanish
 * inside one transition. A constant far larger than any circumference has no
 * second tile to draw at any point in the interpolation. It is the number
 * `@starting-style` already uses for the same reason.
 */
const GAP = 9999

/**
 * How much of the radius the ring takes, by name.
 *
 * **The outer edge is fixed and the radius follows the thickness**, which is
 * what makes `none` a pie. The stroke sits astride its own radius, so a ring
 * drawn at a fixed `r` grows outward as well as inward: against a 100 box, a
 * fixed `r=40` has an unstated ceiling at a thickness of 20, and anything past
 * it crosses the view box and is cut with nothing to say so.
 *
 * Derived instead, `r = EDGE - thickness / 2`, the outer edge lands on `EDGE`
 * for every value and the inner edge is `EDGE - thickness`. A pie is where the
 * inner edge reaches the center, which solves to `thickness = EDGE`: the ring
 * is then drawn at `r = EDGE / 2` and its stroke spans the whole radius.
 *
 * `EDGE * 2` was the first answer and is the trap in this arithmetic. It gives
 * `r = 0`, and a circle of radius zero draws nothing at all, so a pie came out
 * as an empty box. The stroke reaches `thickness / 2` either side of `r`, not
 * `thickness`.
 */
const THICKNESS: Record<string, number> = {
  large: 8,
  medium: 16,
  none: EDGE,
  small: 26,
}

/**
 * @summary A chart that shows parts of a whole as a ring, read from a table.
 *
 * @description
 * The chart with the narrowest honest use, so the component is narrow too.
 *
 * **It reads one column and treats the rows as the parts.** Every other chart
 * here takes a column per series; a ring has one whole to divide, so the first
 * column of numbers is the series and each row is a slice.
 *
 * **It refuses negative values rather than drawing them.** An arc for a
 * negative number either runs backwards over its neighbors or is silently
 * dropped. Those rows are skipped and the total is of what is left.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Pie Chart, Ring Chart, Share Chart
 * @documentation https://fusion.dev/helix/components/donut-chart
 *
 * @slot - Content in the middle of the ring, usually a total.
 *
 * @csspart center - The middle of the ring, holding whatever is slotted.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plot - The drawing.
 * @csspart segment - One slice.
 * @csspart segment-active - The slice under the pointer. Set alongside `segment`.
 * @csspart segment-edge - One slice as a closed shape, used to draw its outline.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading. Set alongside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The slice's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading. Set alongside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading. Set alongside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading. Set alongside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 * @csspart track - The ring the slices are drawn on.
 *
 * @cssproperty --donut-chart-stroke - How thick the ring is drawn, derived from `hole`.
 */
@customElement('helix-headless-donut-chart')
export class HelixHeadlessDonutChart extends MixinChartSource(HelixElement) {
  /**
   * The pointer is not mapped across this one.
   *
   * Every other chart lays its readings out along the line, so the nearest is
   * arithmetic on x. A ring's slices are real elements at every angle, and x
   * alone would answer with whichever slice shared a horizontal position with
   * the pointer: at three o'clock and at nine o'clock it would give the same
   * reading for opposite sides of the chart. So the slices say which one they
   * are and this only holds the answer.
   *
   * Set here rather than in a constructor, and it must not move there: the
   * analyzer reads `this.pointer.axis = 'none'` in a constructor body as the
   * declaration of a public field, and fails the build demanding a description
   * for a member this class does not have.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    this.pointer.axis = 'none'
  }

  /**
   * The size of the hole in the middle of the ring.
   *
   * Absent is a ring with room for a total in it. `small` and `large` move the
   * hole without moving the outer edge, so a chart keeps its footprint.
   *
   * **`none` is a pie**, and it is the same drawing rather than another one:
   * the radius follows the thickness, so the inner edge reaching the center is
   * what closing the hole means. A pie reads less accurately than a ring, angle
   * being harder to judge than length, but it is not *misleading* the way a bar
   * measured from anything but zero is, which is why this is a value here and
   * the bar chart's baseline is not a property at all.
   *
   * **Geometry rather than a CSS hook.** The dash arithmetic needs the
   * circumference, which needs the radius, and reading a custom property means
   * `getComputedStyle`, which is client-only: a server would draw a different
   * ring than the client. A plot's proportions are markup for the same reason
   * `curve` is.
   *
   * **And so it does not reflect**, which is the same argument read forward. No
   * selector on either tier asks about it and none can want to: everything the
   * thickness decides is arithmetic done here and published as
   * `--donut-chart-stroke`, which is a number a rule can do sums with where the
   * word is not. Reflected, it wrote a value onto every host a script had set
   * it on for nothing to read. `sweep` beside it is the converse and reflects,
   * because the styled sheet selects on it.
   */
  @property()
  hole?: 'large' | 'none' | 'small'

  /**
   * How much of the circle the whole occupies.
   *
   * Absent is the full turn. `half` is a semi-donut: the same shares spread
   * over a half circle that opens downward, which is the shape a dashboard
   * uses when the ring sits above a figure and the space below it is doing
   * something else.
   *
   * **A second property rather than another `hole` value**, because the two are
   * different axes and can both be true: `hole` is radial and says how thick
   * the band is, this is angular and says how far round it goes. A `half`
   * `none` is a semi-pie and is a real thing to want.
   *
   * **Not a gauge.** A gauge is one value against a range, which is a different
   * data shape entirely and is `Meter`, whose `round` example already draws the
   * reading as a ring. This divides a whole into parts and then declines to use
   * the bottom half of the circle.
   *
   * Reflected, because the stylesheet has three things to say about it: the
   * rotation that puts the first slice at nine o'clock, the aspect ratio of a
   * box that is no longer square, and where the middle sits once the bottom of
   * the circle is not drawn.
   */
  @property({ reflect: true })
  sweep?: 'half'

  /** The fraction of the circle the shares are spread over. */
  private get span(): number {
    return this.sweep === 'half' ? 0.5 : 1
  }

  /**
   * Where the first slice starts, as an angle from three o'clock.
   *
   * Twelve for a whole ring and nine for a half, the turns the stylesheet gives
   * the circles. Anything drawn or placed by arithmetic has to start from the
   * same place, or it describes a slice the ring is not showing there.
   */
  private get origin(): number {
    return this.sweep === 'half' ? Math.PI : -Math.PI / 2
  }

  /** How thick the ring is drawn, in the drawing's own units. */
  private get thickness(): number {
    return THICKNESS[this.hole ?? 'medium'] ?? THICKNESS.medium ?? 0
  }

  /** The ring's radius, which follows its thickness so the outer edge holds. */
  private get radius(): number {
    return EDGE - this.thickness / 2
  }

  private get shares(): { fraction: number; start: number }[] {
    const series = this.series
    const values = (series[0]?.points ?? [])
      .map((point) => point.value)
      .map((value) => (Number.isFinite(value) && value > 0 ? value : 0))
    const total = values.reduce((sum, one) => sum + one, 0)
    if (total === 0) {
      return []
    }
    let start = 0
    return values.map((value) => {
      const fraction = value / total
      const at = start
      start += fraction
      return { fraction, start: at }
    })
  }

  protected override render(): TemplateResult {
    const shares = this.shares
    /* No middle where there is no hole. A `center` part over a pie would put
       slotted content on top of the slices, and a slot nobody can see is worse
       than one that is not there: a consumer fills it and nothing happens. */
    return html`${this.renderPlot(shares)}
`
  }

  /**
   * The ring itself, behind a seam the styled tier can move.
   *
   * `aria-hidden`, because the table it was read from is the readable version
   * and a screen reader hearing both hears the same numbers twice.
   */
  protected renderPlot(shares: { fraction: number; start: number }[]): TemplateResult {
    /* The thickness is declared here, on the box that holds both the ring and
       the middle, and never on the slices. A custom property inherits down and
       never sideways, so `[part="center"]` is a sibling of the circles and would
       only ever read the fallback, sizing the hole as if every ring were the
       resting thickness. */
    return html`<div
      aria-hidden="true"
      id=${CHART_PLOT}
      part="plot"
      style="--donut-chart-stroke: ${this.thickness}"
    >
      <svg
        data-mirror=${this.sweep === 'half' ? '' : nothing}
        viewBox=${this.frame}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx=${CENTER}
          cy=${CENTER}
          fill="none"
          part="track"
          r=${this.radius}
          stroke-dasharray="${2 * Math.PI * this.radius * this.span} ${GAP}"
          stroke-width=${this.thickness}
        />
        ${shares.map((share, index) => this.renderSegment(share, index))}
      </svg>
      ${this.hole === 'none' ? nothing : html`<div part="center"><slot></slot></div>`}
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * The view box, cropped to what is actually drawn.
   *
   * A full turn uses the square. A half arc uses the band from the top of the
   * ring down to the center line, plus the half stroke its flat ends hang
   * below that, and cropping to it is the difference between a semi-donut and a
   * semi-donut with an empty quarter of the box under it. The outer edge is
   * `EDGE` from the center whatever the thickness, which is what makes this two
   * numbers rather than a measurement.
   */
  private get frame(): string {
    if (this.sweep !== 'half') {
      return `0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`
    }
    return `0 ${CENTER - EDGE} ${PLOT_WIDTH} ${EDGE + this.thickness / 2}`
  }

  /** One slice, as a dash the length of its share. */
  protected renderSegment(
    share: { fraction: number; start: number },
    index: number,
  ): TemplateResult {
    const circumference = 2 * Math.PI * this.radius
    const length = share.fraction * circumference * this.span
    /* Negative, because `stroke-dashoffset` counts backwards along the path:
       a positive offset would run the slices anticlockwise from twelve. The
       rotation that puts zero at the top is the stylesheet's, since it is a
       fact about how the picture is presented rather than about the numbers. */
    const active = this.pointer.at === index
    return svg`<circle
      cx=${CENTER}
      cy=${CENTER}
      data-active=${active ? '' : nothing}
      data-series=${seriesIndex(index)}
      fill="none"
      style="--chart-series: var(--chart-series-${seriesIndex(index)})"
      @pointerenter=${() => this.pointer.set(index)}
      part="segment${active ? ' segment-active' : ''}"
      r=${this.radius}
      stroke-dasharray="${length} ${GAP}"
      stroke-dashoffset=${-share.start * circumference * this.span}
    />
    ${this.renderEdge(share, index)}`
  }

  /**
   * The same slice again, as a shape with an inside.
   *
   * **A stroked arc has no boundary to draw, which is why this exists.** The
   * segment above is a dash on a circle: the mark *is* the edge, so there is
   * nothing for an outline to trace and nothing within it to fade. Anything
   * wanting those two separately needs the slice as a closed path, and this is
   * it: the outer arc, a step inward, the inner arc back, closed.
   *
   * **Rendered always and painted only sometimes**, which is what keeps this on
   * this tier. Whether a boundary is drawn is a styled question and the answer
   * lives in a stylesheet; whether the geometry a boundary would need exists at
   * all is structural, and a component cannot conjure a shape from CSS. So the
   * path is here for every donut and is `fill: none; stroke: none` until
   * something asks for it.
   *
   * **Not a replacement for the dash.** The dash carries three jobs and only
   * one of them is the shape: a share growing is a `stroke-dasharray`
   * interpolating with no reflow, and `@starting-style` on that same property is
   * the whole reason the ring sweeps in rather than appearing. A `d` cannot do
   * either. CSS interpolates one only between paths of identical command
   * structure, and the large-arc flag flips the moment a slice crosses a half
   * turn, so a growing slice would pop partway through the transition it was
   * meant to smooth. Both animations stay on the dash and this path follows it.
   *
   * The turn to twelve o'clock, or to nine for a half, is `origin` here rather
   * than the rotation the stylesheet gives the circles. That rule uses
   * `transform-box: fill-box`, so it spins each element about its own bounding
   * box, which is the ring's center for a circle and is not for a sector.
   */
  protected renderEdge(share: { fraction: number; start: number }, index: number): TemplateResult {
    const turn = 2 * Math.PI * this.span
    const from = share.start * turn + this.origin
    const to = (share.start + share.fraction) * turn + this.origin
    const outer = EDGE
    const inner = EDGE - this.thickness
    const at = (radius: number, angle: number): string =>
      `${(CENTER + Math.cos(angle) * radius).toFixed(3)} ${(CENTER + Math.sin(angle) * radius).toFixed(3)}`
    const wide = to - from > Math.PI ? 1 : 0
    /* A slice that is the whole ring starts and ends at one point, and an arc
       between a point and itself draws nothing. Split at the halfway angle so
       each half is a real arc. */
    const full = to - from >= 2 * Math.PI - 1e-6
    const mid = from + (to - from) / 2
    const outward = full
      ? `A ${outer} ${outer} 0 0 1 ${at(outer, mid)} A ${outer} ${outer} 0 0 1 ${at(outer, to)}`
      : `A ${outer} ${outer} 0 ${wide} 1 ${at(outer, to)}`
    /* A pie has no inner arc: the radius solves to zero and the two ends meet at
       the middle, so the step back is a line to the center and not an arc of no
       size. */
    const homeward =
      inner <= 0
        ? `L ${CENTER} ${CENTER}`
        : full
          ? `L ${at(inner, to)} A ${inner} ${inner} 0 0 0 ${at(inner, mid)} A ${inner} ${inner} 0 0 0 ${at(inner, from)}`
          : `L ${at(inner, to)} A ${inner} ${inner} 0 ${wide} 0 ${at(inner, from)}`
    const shape = `M ${at(outer, from)} ${outward} ${homeward} Z`
    /* **Clipped to itself, because a stroke straddles the line it is drawn on.**
       Half of it falls outside the wedge: past the fill on both arcs, and across
       the seam into the neighbor on both radial sides, where that neighbor is
       drawing the same line from the other direction and the two overlap. Seen
       as a doubled edge at every join and a halo around the ring.

       Clipping to the same path keeps the inner half and drops the outer, so an
       edge stays inside the slice it belongs to and two adjacent edges meet
       exactly. The clip is the shape itself, so it costs no second geometry and
       cannot drift from it.

       Ids are scoped to the shadow root, so an index is enough to keep them
       apart, and two donuts on a page cannot collide. */
    /* **`fill="none"` as an attribute, not a rule, because this tier has
         no rules.** An SVG path fills black by default, and a `fill: none` in
         some sheet covers only the pages that load it: everywhere else these
         closed shapes paint over the ring.

         A presentation attribute loses to any CSS rule, so a sheet still
         decides and a consumer can still fill this if they want one.
         What it cannot do is fill by accident on the tier whose whole premise
         is that it ships no CSS. */
    const clip = `helix-donut-edge-${index}`
    return svg`<clipPath id=${clip}><path d=${shape} /></clipPath>
    <path
      clip-path="url(#${clip})"
      d=${shape}
      data-active=${this.pointer.at === index ? '' : nothing}
      data-series=${seriesIndex(index)}
        fill="none"
      part="segment-edge"
      style="--chart-series: var(--chart-series-${seriesIndex(index)})"
    />`
  }
  /**
   * What a pointer resting on a slice shows.
   *
   * Placed in the middle rather than along an axis, a ring having none, and the
   * middle is where a reader is already looking: the hole usually holds a
   * total, so a tooltip over it replaces one figure with the one being asked
   * about rather than covering something else.
   */
  protected renderTooltip(): TemplateResult | typeof nothing {
    const at = this.pointer.at
    const share = this.shares[at]
    if (!share) {
      return drawTooltip(this.sourceRows, at, this.tag('tooltip'))
    }
    /* **Outside the ring, on the slice's own bearing**, rather than centered in
       the hole: centered covers the data on a pie, and in neither shape does it
       say *which* slice it means. Out here one rule serves both.

       The mid-angle, from `origin` because the ring is turned to start at
       twelve o'clock, or nine for a half, and this arithmetic starts at three.
       The point is the outer edge. A half ring's box is cropped to the band it
       draws, so the height is measured from the top of that band. */
    const angle = (share.start + share.fraction / 2) * 2 * Math.PI * this.span + this.origin
    const edge = EDGE
    const x = CENTER + Math.cos(angle) * edge
    const top = this.sweep === 'half' ? CENTER - EDGE : 0
    const tall = this.sweep === 'half' ? EDGE + this.thickness / 2 : PLOT_HEIGHT
    const y = ((CENTER + Math.sin(angle) * edge - top) / tall) * 100
    /* **A whole ring stays as drawn on a right-to-left page, and a half ring
       turns.** Clockwise from twelve is a clock's convention, and a clock does
       not run backwards in Arabic or Hebrew, so the ring's bearing is measured
       from the left in either direction. A half ring is read across, the first
       slice where a line of text starts, so it is marked `data-mirror` like any
       axis and its bearing is measured from the inline start, with the side the
       bubble prefers turned to match. */
    const turned = this.sweep === 'half' && this.pointer.mirrored
    const across = Math.cos(angle) > 0 !== turned
    return drawTooltip(
      this.sourceRows,
      at,
      this.tag('tooltip'),
      {
        fixed: this.sweep !== 'half',
        /* The preferred side from the bearing's dominant axis, and
           `FloatingController` moves it if that side does not fit. A fixed side
           cannot express a bearing, so the arrow misses the ring; a preference
           plus flipping can. */
        placement:
          Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
            ? across
              ? 'right'
              : 'left'
            : Math.sin(angle) > 0
              ? 'bottom'
              : 'top',
        x: `${x}%`,
        y: `${y}%`,
      },
      /* **A ring's series are its rows and not its columns**, which is the one
         place the mixin's answer is wrong by more than an offset. The bubble is
         about one slice, so every cell in it belongs to that slice's color;
         counted by column every slice's bubble came out series one, the first
         slice's own, beside a ring painting the third slice something else. */
      () => seriesIndex(at),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-donut-chart': HelixHeadlessDonutChart
  }
}
