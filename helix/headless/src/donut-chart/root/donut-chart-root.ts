import { customElement, HelixElement, MixinChartSource, seriesIndex } from '@helix-io/core'
import { html, nothing, svg, type TemplateResult } from 'lit'

/** The drawing's own coordinates, square because the shape has to stay round. */
const BOX = 100
const CENTRE = BOX / 2

/** Where the ring is drawn, leaving room for the stroke on either side. */
const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

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
 * @csspart segment - One slice.
 * @csspart track - The ring the slices are drawn on.
 *
 * @slot - Goes in the middle of the ring. A total, usually.
 */
@customElement('helix-base-donut-chart')
export class HelixBaseDonutChart extends MixinChartSource(HelixElement) {
  /** The slices, in table order, with anything negative dropped. */
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
    return html`${this.renderPlot(shares, named)}
      <div part="centre"><slot></slot></div>`
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
        <circle cx=${CENTRE} cy=${CENTRE} fill="none" part="track" r=${RADIUS} />
        ${shares.map((share, index) => this.renderSegment(share, index))}
      </svg>
    </div>`
  }

  /** One slice, as a dash the length of its share. */
  protected renderSegment(
    share: { fraction: number; start: number },
    index: number,
  ): TemplateResult {
    const length = share.fraction * CIRCUMFERENCE
    /* Negative, because `stroke-dashoffset` counts backwards along the path:
       a positive offset would run the slices anticlockwise from twelve. The
       rotation that puts zero at the top is the stylesheet's, since it is a
       fact about how the picture is presented rather than about the numbers. */
    return svg`<circle
      cx=${CENTRE}
      cy=${CENTRE}
      data-series=${seriesIndex(index)}
      fill="none"
      part="segment"
      r=${RADIUS}
      stroke-dasharray="${length} ${CIRCUMFERENCE - length}"
      stroke-dashoffset=${-share.start * CIRCUMFERENCE}
    />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-donut-chart': HelixBaseDonutChart
  }
}
