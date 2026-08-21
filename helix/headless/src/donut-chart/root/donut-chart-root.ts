import {
  customElement,
  drawTooltip,
  HelixElement,
  MixinChartSource,
  seriesIndex,
} from '@helix-io/core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The drawing's own coordinates, square because the shape has to stay round. */
const BOX = 100
const CENTRE = BOX / 2

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
 * what makes `none` a pie and makes clipping impossible. The stroke sits astride
 * its own radius, so a ring drawn at a fixed `r` grows outward as well as
 * inward: measured against a 100 box, the old fixed `r=40` had an unstated
 * ceiling at a thickness of 20, and anything past it crossed the view box and
 * was cut with nothing to say so. Closing the hole that way would have needed a
 * thickness of 80, spanning `r=0` to `r=80` in a box whose half is 50.
 *
 * Derived instead, `r = EDGE - thickness / 2`, the outer edge lands on `EDGE`
 * for every value and the inner edge is `EDGE - thickness`. A pie is where the
 * inner edge reaches the centre, which solves to `thickness = EDGE`: the ring
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
 * @summary Parts of a whole as a ring, read from a table.
 *
 * @description
 * The chart with the narrowest honest use, so the component is narrow too.
 *
 * **It reads one column and treats the rows as the parts.** Every other chart
 * here takes a column per series; a ring has one whole to divide, and a second
 * ring inside the first is two charts sharing a picture in the most literal
 * way. So the first column of numbers is the series and each row is a slice.
 *
 * **It refuses negative values rather than drawing them.** A share of a whole
 * cannot be less than nothing, and an arc for a negative number either runs
 * backwards over its neighbours or is silently dropped. Those rows are skipped
 * and the total is of what is left, which is the only reading that stays true.
 *
 * **The shape is drawn with a dashed stroke, not with arc commands.** One
 * `<circle>` per slice, its dash set to the slice's share of the circumference
 * and its offset to where the slice begins. Arc paths need the sweep flag and a
 * large-arc flag, both of which flip at values a reader never sees coming, and
 * a slice of exactly one whole becomes a path with no length at all.
 *
 * **And it keeps its aspect ratio**, alone among the charts here. The others
 * set `preserveAspectRatio="none"` so one drawing fills any box and rescue
 * their strokes with `vector-effect`; that rescues strokes and not geometry, so
 * a ring drawn the same way is an ellipse in anything but a square.
 *
 * The table is the accessible representation and this drawing is `aria-hidden`.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Pie Chart, Ring Chart, Share Chart
 * @documentation https://helix.fusion.dev/components/donut-chart
 *
 * @csspart centre - The middle of the ring, holding whatever is slotted.
 * @csspart plot - The drawing.
 * @csspart tooltip - What a pointer resting on a slice shows.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The slice's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 * @csspart segment - One slice.
 * @csspart track - The ring the slices are drawn on.
 *
 * @slot - Goes in the middle of the ring. A total, usually.
 */
@customElement('helix-base-donut-chart')
export class HelixBaseDonutChart extends MixinChartSource(HelixElement) {
  /** The slices, in table order, with anything negative dropped. */
  /**
   * The pointer is not mapped across this one.
   *
   * Every other chart lays its readings out left to right, so the nearest is
   * arithmetic on x. A ring's slices are real elements at every angle, and x
   * alone would answer with whichever slice shared a horizontal position with
   * the pointer: at three o'clock and at nine o'clock it would give the same
   * reading for opposite sides of the chart. So the slices say which one they
   * are and this only holds the answer.
   *
   * Set here rather than in a constructor, and that is not a style choice. The
   * analyzer reads `this.pointer.tracks = false` in a constructor body as a
   * declaration of a public field called `tracks`, and failed the build with
   * `HelixBaseDonutChart.tracks has no description` for a member that does not
   * exist on this class at all.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    this.pointer.tracks = false
  }

  /**
   * How much is left open in the middle.
   *
   * Absent is a ring with room for a total in it. `small` and `large` move the
   * hole without moving the outer edge, so a chart keeps its footprint.
   *
   * **`none` is a pie**, and it is the same drawing rather than another one:
   * the radius follows the thickness, so the inner edge reaching the centre is
   * what closing the hole means. A pie reads less accurately than a ring, angle
   * being harder to judge than length, but it is not *misleading* the way a bar
   * measured from anything but zero is, which is why this is a value here and
   * the bar chart's baseline is not a property at all.
   *
   * **Geometry rather than a CSS hook, and it had to move.** This was
   * `--donut-chart-thickness`, and the dash arithmetic needs the circumference,
   * which needs the radius: reading a custom property means `getComputedStyle`,
   * which is client-only, so a server would have drawn a different ring than
   * the client. A plot's proportions are markup for the same reason `curve` is.
   */
  @property({ reflect: true })
  hole?: 'large' | 'none' | 'small'

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
    const named = this.named
    /* No middle where there is no hole. A `centre` part over a pie would put
       slotted content on top of the slices, and a slot nobody can see is worse
       than one that is not there: a consumer fills it and nothing happens. */
    return html`${this.renderPlot(shares, named)}
      ${this.hole === 'none' ? nothing : html`<div part="centre"><slot></slot></div>`}
      ${this.renderTooltip()}`
  }

  /**
   * The ring itself, behind a seam the styled tier can move.
   *
   * `aria-hidden`, because the table it was read from is the readable version
   * and a screen reader hearing both hears the same numbers twice.
   */
  protected renderPlot(
    shares: { fraction: number; start: number }[],
    named: string,
  ): TemplateResult {
    return html`<div aria-hidden="true" part="plot" title=${named || nothing}>
      <svg viewBox="0 0 ${BOX} ${BOX}" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx=${CENTRE}
          cy=${CENTRE}
          fill="none"
          part="track"
          r=${this.radius}
          stroke-width=${this.thickness}
        />
        ${shares.map((share, index) => this.renderSegment(share, index))}
      </svg>
    </div>`
  }

  /** One slice, as a dash the length of its share. */
  protected renderSegment(
    share: { fraction: number; start: number },
    index: number,
  ): TemplateResult {
    const circumference = 2 * Math.PI * this.radius
    const length = share.fraction * circumference
    /* Negative, because `stroke-dashoffset` counts backwards along the path:
       a positive offset would run the slices anticlockwise from twelve. The
       rotation that puts zero at the top is the stylesheet's, since it is a
       fact about how the picture is presented rather than about the numbers. */
    return svg`<circle
      cx=${CENTRE}
      cy=${CENTRE}
      data-active=${this.pointer.at === index ? '' : nothing}
      data-series=${seriesIndex(index)}
      fill="none"
      @pointerenter=${() => this.pointer.set(index)}
      part="segment"
      r=${this.radius}
      style="--_donut-thickness: ${this.thickness}"
      stroke-dasharray="${length} ${GAP}"
      stroke-dashoffset=${-share.start * circumference}
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
    /* Over the hole where there is one, and above the drawing where there is
       not: a tooltip centred on a pie covers the slices it is describing. */
    return drawTooltip(this.rows, this.pointer.at, '50%')
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-donut-chart': HelixBaseDonutChart
  }
}
