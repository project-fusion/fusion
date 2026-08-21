import {
  type Curve,
  customElement,
  extent,
  HelixElement,
  linear,
  linePath,
  type Point,
  readSeries,
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
 * stops. So an unlabelled sparkline is `aria-hidden`, and a labelled one is an
 * image named by its sentence.
 *
 * It goes *beside* a `Stat` rather than inside one. The plan this was built
 * from called for a `trend` slot on `Stat`; the spec already on `Stat` says the
 * opposite, that a change beside a figure is a second fact, and the spec is
 * right. `Trend` composes the same way.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://helix.fusion.dev/components/sparkline
 *
 * @csspart area - The region between the line and the bottom of its range.
 * @csspart line - The path itself.
 * @csspart svg - The drawing.
 * @csspart terminus - The mark on the last value.
 * @csspart wash-end - The far stop of the area's gradient.
 * @csspart wash-start - The stop of the area's gradient that meets the line.
 */
@customElement('helix-base-sparkline')
export class HelixBaseSparkline extends HelixElement {
  /**
   * How the line gets from one reading to the next.
   *
   * Absent joins them and claims nothing in between, which is why it is the
   * default. `smooth` is easier to follow across a long series and invents the
   * values between the readings, so it is a reading aid rather than a neutral
   * one; it is monotone cubic, so what it invents never leaves the band the
   * data sets. `step` claims the opposite, that a reading holds until the next.
   *
   * This tier and not the one above, though it is a drawing decision: a curve
   * is expressed as path data, and path data is markup. `linePath` in
   * `helix/core` is the shared implementation, so every chart that draws a line
   * offers the same three and draws them the same way.
   */
  @property({ reflect: true })
  curve?: Curve

  /**
   * The id of a table to read instead, when there is one behind the line.
   *
   * The first column of numbers is the series drawn. This wins over `values`,
   * because a table is the readable representation and a list of numbers in an
   * attribute is not: given both, the one a reader can also read should be the
   * one the drawing agrees with.
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

  #observer: MutationObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.#watch()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.#watch()
    }
  }

  /** The table `for` names, or null where there is no document to ask. */
  #table(): HTMLTableElement | null {
    if (this.for === '') {
      return null
    }
    const root = this.getRootNode() as Document | ShadowRoot
    const found = root.getElementById?.(this.for)
    // `tagName` rather than `instanceof`, which is not a guard on the server.
    return found?.tagName === 'TABLE' ? (found as HTMLTableElement) : null
  }

  /** The series to draw: the table if there is one, the attribute otherwise. */
  #points(): number[] {
    const table = this.#table()
    if (table) {
      return readSeries(table)[0]?.points.map((point) => point.value) ?? []
    }
    return readValues(this.values)
  }

  /** Follows the table, so an update to the numbers reaches the line. */
  #watch(): void {
    this.#observer?.disconnect()
    const table = this.#table()
    if (!table || typeof MutationObserver === 'undefined') {
      return
    }
    this.#observer ??= new MutationObserver(() => {
      this.requestUpdate()
    })
    this.#observer.observe(table, { characterData: true, childList: true, subtree: true })
  }

  protected override render(): TemplateResult {
    const points = this.#points()
    /* Two points minimum, because one is not a trend and zero is not a line.
       An `<svg>` given a `d` of `M NaN,NaN` draws nothing and reports nothing,
       so the empty case is stated here rather than left to look like a bug. */
    const x = linear([0, Math.max(points.length - 1, 1)], [0, BOX.width])
    const y = linear(extent(points.length > 0 ? points : [0]), [BOX.height, 0])
    const coordinates: Point[] = points.map((value, index) => [x(index), y(value)])
    const path = linePath(coordinates, this.curve)

    /* The same line closed down to the floor of its own range, which is where
       the fill goes. Drawn always and painted only by `appearance`: the shape
       is geometry and belongs to this tier, and whether anything is poured into
       it is a decision for the one above. A headless consumer gets the region
       without having to work out that a sparkline's baseline is its minimum
       rather than zero, which is the part that is easy to get wrong.

       Its own path rather than a fill on the line, because a closed path
       strokes its closing edges too: filling the line itself would draw a rule
       along the bottom of the box and up both sides. */
    const area = path === '' ? '' : `${path}L${BOX.width},${BOX.height}L0,${BOX.height}Z`

    return html`<svg
        aria-hidden=${this.label === '' ? 'true' : nothing}
        aria-label=${this.label === '' ? nothing : this.label}
        part="svg"
        preserveAspectRatio="none"
        role=${this.label === '' ? nothing : 'img'}
        viewBox="0 0 ${BOX.width} ${BOX.height}"
      >
        ${
          /* The ramp the area is poured with, drawn here because a gradient is
             an element and elements are this tier's business, and coloured
             above because a colour is not. Measured rather than assumed: a
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
          path === '' ? nothing : svg`<path d=${area} part="area" /><path d=${path} part="line" />`
        }
      </svg>
      ${
        /* The mark on the last value, as an element beside the drawing rather
           than a `<circle>` inside it. `preserveAspectRatio="none"` is what lets
           the line fill any box, and it distorts everything in that coordinate
           space with it: a circle in there is an ellipse whose squash depends on
           how wide the consumer made it. Percentages of the host are the same
           two numbers in a space nothing stretches. */
        points.length < 2
          ? nothing
          : html`<span
              aria-hidden="true"
              part="terminus"
              style="--_chart-terminus-x: 100%; --_chart-terminus-y: ${
                (y(points[points.length - 1] as number) / BOX.height) * 100
              }%"
            ></span>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-sparkline': HelixBaseSparkline
  }
}
