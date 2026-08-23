import { customElement, seriesIndex } from '@helix-io/core'
import { HelixBaseBarChart } from '@helix-io/headless'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../chart/series.css.js'
import { styles } from './bar-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary Categories as columns, read from a table.
 *
 * @description
 * The columns take the series palette in order, so a chart of one is series one
 * and a chart of four is the first four. Rounded at the far end only, because a
 * column grows from the baseline and a rounded foot would lift it off the rule
 * it is measured against.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Column Chart, Categorical Chart
 * @documentation https://helix.fusion.dev/components/bar-chart
 *
 * @cssproperty --bar-chart-band-color - The slot the pointer is resting in.
 * @cssproperty --bar-chart-line-color - A `lines` series, overriding its series colour.
 * @cssproperty --bar-chart-line-width - Thickness of a `lines` series.
 * @cssproperty --bar-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --bar-chart-bar-radius - Corner radius at the far end of a column.
 * @cssproperty --bar-chart-bar-stroke - Width of the edge an `outlined` or `subtle`
 *   column is drawn with.
 * @cssproperty --bar-chart-block-size - Height of the drawing.
 * @cssproperty --bar-chart-gap - Space between the drawing and its labels.
 */
@customElement('helix-bar-chart')
export class HelixBarChart extends HelixBaseBarChart {
  /**
   * What the columns are made of.
   *
   * **A third axis on the chart, not on the bar.** A bar is a mark inside a
   * drawing and nobody writes markup for one; the chart is what a consumer
   * addresses, so the choice belongs here and reaches every column at once.
   *
   * `glass` lets the gridlines read through the columns, which is what puts a
   * chart in the same language as a glass header rather than leaving it the one
   * opaque slab on the page.
   *
   * **`gradient` was here and is `wash` now, which is #156.** The two set
   * different properties, `fill-opacity` against `fill`, and a chart forced into
   * both renders as a translucent gradient that is distinct from either: one
   * enum was holding two independent things, which is the mistake `Card`'s own
   * doc warns about arriving on the component that borrowed the word.
   *
   * Absent is solid, per the rule that a reflected property takes no default,
   * so the stylesheet describes only the departure. The strength is the
   * theme's: `glass` scales with `--helix-material-opacity`, so a language that
   * is more see-through everywhere is more see-through here.
   *
   * Styled rather than headless, because what a bar is filled with is a
   * treatment and this tier is where treatments live. The gradient it points at
   * is drawn below, which is an element and therefore that tier's business.
   */
  @property({ reflect: true })
  material?: 'glass'

  /**
   * How a column's fill is distributed across it.
   *
   * `gradient` fades each column toward its base, into the wash the headless
   * tier draws whether or not anything points at it.
   *
   * **A chart-domain axis and deliberately not a library one.** It lives on this
   * family alone, and here it is a way of encoding data rather than a way of
   * expressing a theme: promoted to the registry it would put an attribute on
   * eighty-eight components that means nothing on eighty-seven. `wash` because
   * that is what the tier below already calls it, in `--chart-bar-wash` and in
   * the `bar-wash-start` and `bar-wash-end` stops.
   */
  @property({ reflect: true })
  wash?: 'gradient'

  /**
   * Which series are glass rather than solid, by name.
   *
   * Matched the way `outlined` is, against the column headings the table gives.
   *
   * **Per series for the reason `emphasis` is, arrived at one axis later.** A
   * chart-wide material puts every column in the same substance, which is right
   * when the whole chart is joining the page's language and wrong the moment one
   * series is a different kind of fact from the others. The two axes take the
   * same shape because they answer the same question about the same thing: what
   * is *this series* made of, and how much ink does *this series* claim.
   */
  @property()
  glass?: string

  /**
   * How much ink the columns claim.
   *
   * The chart's treatment, which every series takes unless `outlined` or
   * `subtle` names it. `outlined` is the mark as its edge alone, `subtle` a wash
   * of the series colour with that edge on it, and absent is the filled column,
   * per the rule that a reflected property takes no default.
   *
   * **It composes with `material` rather than competing with it.** Emphasis
   * decides what is drawn and material decides how much of it comes through, so
   * `glass` thins whatever emphasis put there: the fill on a solid column, the
   * stroke on an outlined one. That corner was inert when the two were first
   * put side by side, `glass` setting a fill opacity on a mark whose fill is
   * `none`, and a combination that silently does nothing is the trap
   * `--card-backdrop` was for the one commit it shipped alone.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * Which series are drawn as an outline rather than a fill, by name.
   *
   * Space separated and matched against the column headings the table gives,
   * the way `lines` and `secondary` are, so a chart says `outlined="Forecast"`
   * rather than counting columns. Names because they are what the table already
   * carries and what the legend already shows.
   *
   * **The case this exists for is a series that is not a measurement.** A
   * forecast, a target, a budget: something drawn on the same axis as the
   * others and not the same kind of fact, which an outline says without a
   * second legend or a note under the chart.
   *
   * Per series and not per bar, because a bar is a mark inside a drawing and
   * nobody writes markup for one, which is the same reason `material` sits on
   * the chart.
   */
  @property()
  outlined?: string

  /** Which series are drawn as a wash of their colour, by name. Matched as `outlined` is. */
  @property()
  subtle?: string

  /**
   * Marks each column with the treatments its series asked for.
   *
   * **Stamped after render rather than rendered, because the tier that draws
   * the columns is the one that must not know about treatments.** The headless
   * tier already writes `data-series` on every rect so a stylesheet can colour
   * it; this reads the same mark, resolves the names against the series the
   * table gave, and writes `data-emphasis` beside it. The stylesheet does the
   * rest, so nothing about painting crosses the tier boundary.
   *
   * The mark is the palette slot rather than the series ordinal, so past the
   * palette's width two series share one. They share a colour there too, which
   * is the same limit arriving in a second place rather than a new one.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)

    const slots = (list?: string): Set<number> =>
      new Set(
        (list ?? '')
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((name) => name.toLowerCase())
          .flatMap((name) => {
            const at = this.series.findIndex((one) => one.name.trim().toLowerCase() === name)
            return at < 0 ? [] : [seriesIndex(at)]
          }),
      )

    const mark = (bar: SVGRectElement, name: string, value: string | undefined): void => {
      if (value) {
        bar.setAttribute(`data-${name}`, value)
      } else {
        bar.removeAttribute(`data-${name}`)
      }
    }

    const outlined = slots(this.outlined)
    const subtle = slots(this.subtle)
    const glass = slots(this.glass)
    for (const bar of this.renderRoot.querySelectorAll<SVGRectElement>('[part="bar"]')) {
      const at = Number(bar.dataset.series)
      mark(bar, 'emphasis', outlined.has(at) ? 'outlined' : subtle.has(at) ? 'subtle' : undefined)
      mark(bar, 'material', glass.has(at) ? 'glass' : undefined)
    }
  }

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-bar-chart': HelixBarChart
  }
}
