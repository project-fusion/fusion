import { customElement, seriesIndex, seriesNames } from '@fusion.dev/helix-core'
import { HelixHeadlessBarChart } from '@fusion.dev/helix-headless/bar-chart'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
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
 * @category charts
 * @groups charts
 * @aliases Column Chart, Categorical Chart
 * @documentation https://fusion.dev/helix/components/bar-chart
 *
 * @cssproperty --bar-chart-band-color - The slot the pointer is resting in.
 * @cssproperty --bar-chart-bar-radius - Corner radius at the far end of a column.
 * @cssproperty --bar-chart-bar-stroke - Width of the edge an `outlined` or `subtle`
 *   column is drawn with.
 * @cssproperty --bar-chart-block-size - Height of the drawing.
 * @cssproperty --bar-chart-gap - Space between the drawing and its labels.
 * @cssproperty --bar-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --bar-chart-line-color - A `lines` series, overriding its series color.
 * @cssproperty --bar-chart-line-width - Thickness of a `lines` series, over `--chart-stroke`.
 * @cssproperty --chart-stroke - Thickness of a `lines` series, one name across this family, Line Chart and Area Chart's top edge, since the three read one shared rule. `--bar-chart-line-width` overrides it here.
 */
@customElement('helix-bar-chart')
export class HelixBarChart extends HelixHeadlessBarChart {
  /**
   * **The styled tier, so the tooltip this renders is the styled one.**
   *
   * `tag()` builds a child's tag name from this prefix, and the base declares
   * `helix-headless-`. Without this override the chart puts a
   * `helix-headless-tooltip` in its shadow root: the behavior with none of the
   * surface, so the reading bubble falls back to the browser's popover defaults,
   * a white 1.5px border, square corners, `0.25em` of padding and the page's
   * font size, and looks like no other tooltip on the site.
   */
  static override tier = 'helix-'

  /**
   * How much ink the columns claim.
   *
   * The chart's treatment, which every series takes unless `outlined` or
   * `subtle` names it. `outlined` is the mark as its edge alone, `subtle` a wash
   * of the series color with that edge on it, and absent is the filled column,
   * per the rule that a reflected property takes no default.
   *
   * `solid` is that filled column written out. It matches no rule in the sheet
   * and lands on the base one, which is what the resting value of every axis in
   * the registry does, and it is worth having so a consumer switching a chart
   * between treatments has a word for the one it started at rather than having
   * to remove the attribute.
   *
   * **It composes with `material` rather than competing with it.** Emphasis
   * decides what is drawn and material decides how much of it comes through, so
   * `glass` thins whatever emphasis put there: the fill on a solid column, the
   * stroke on an outlined one. Without that the corner is inert, `glass` setting
   * a fill opacity on a mark whose fill is `none`, and a combination that
   * silently does nothing is the worst shape this can take.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * Which series are glass rather than solid, by name.
   *
   * Matched the way `outlined` is, against the column headings the table gives.
   *
   * **Per series for the reason `emphasis` is.** A
   * chart-wide material puts every column in the same substance, which is right
   * when the whole chart is joining the page's language and wrong the moment one
   * series is a different kind of fact from the others. The two axes take the
   * same shape because they answer the same question about the same thing: what
   * is *this series* made of, and how much ink does *this series* claim.
   */
  @property()
  glass?: string

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
   * **`gradient` belongs to `wash` and never here (#156).** The two set
   * different properties, `fill-opacity` against `fill`, and a chart forced into
   * both renders as a translucent gradient that is distinct from either: one
   * enum holding two independent things.
   *
   * Absent is solid, per the rule that a reflected property takes no default,
   * so the stylesheet describes only the departure. The strength is the
   * theme's: `glass` scales with `--helix-material-opacity`, so a language that
   * is more see-through everywhere is more see-through here.
   *
   * Styled rather than headless, because what a bar is filled with is a
   * treatment and this tier is where treatments live. The gradient it points at
   * is drawn below, which is an element and therefore that tier's business.
   *
   * **This paints a mark rather than a ground, and the axis still reads the
   * same way.** On a surface the points are how much of the page shows through;
   * on a series they are how much ink the mark has, and the order is the same:
   * `glass` admits most, `frosted` admits less, absent is opaque. The two
   * factors, 0.62 and 0.88, carry the relationship the surface tokens carry
   * between `material-translucent` and `material-translucent-strong`, so a
   * chart and a card mean the same thing by the word.
   *
   * **`transparent` is where this one stops.** A mark with no ink is not a
   * material choice, it is an absent series, and a chart says that by not
   * having the datum rather than by painting it invisibly.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  /**
   * Which series are drawn as an outline rather than a fill, by name.
   *
   * Separated by whitespace or commas and matched against the column headings
   * the table gives, the way `lines` and `secondary` are, so a chart says
   * `outlined="Forecast"` rather than counting columns. Names because they are
   * what the table already carries and what the legend already shows.
   *
   * All five read one splitter, `seriesNames` in `core`, because the sentence
   * above was true of the matching and false of the splitting: these three took
   * a comma and those two did not, so `lines="Gateway, Billing"` drew no line
   * and said nothing.
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

  /**
   * Which series are drawn as a wash of their color, by name.
   *
   * Matched as `outlined` is.
   */
  @property()
  subtle?: string

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
   * Marks each column with the treatments its series asked for.
   *
   * **Stamped after render rather than rendered, because the tier that draws
   * the columns is the one that must not know about treatments.** The headless
   * tier already writes `data-series` on every rect so a stylesheet can color
   * it; this reads the same mark, resolves the names against the series the
   * table gave, and writes `data-emphasis` beside it. The stylesheet does the
   * rest, so nothing about painting crosses the tier boundary.
   *
   * The mark is the palette slot rather than the series ordinal, so past the
   * palette's width two series share one. They share a color there too, which
   * is the same limit arriving in a second place rather than a new one.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)

    const slots = (list?: string): Set<number> =>
      new Set(
        seriesNames(list).flatMap((name) => {
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

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-bar-chart': HelixBarChart
  }
}
