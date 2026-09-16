import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLegend } from '@fusion.dev/helix-headless/legend'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles } from './legend-root.css.js'

/**
 * @summary The names a chart draws, each beside the color it is drawn in.
 *
 * @description
 * A row that wraps, because a legend sits under a chart as wide as the chart
 * and there is no arrangement of eight names that fits every width. Set
 * `--legend-direction` to `column` where it sits beside one instead.
 *
 * The series colors are mapped on this tier rather than in the one below, which
 * carries the index and holds no tokens. `shared/chart/series.css` is where the
 * mapping lives, because an index in markup cannot select a token and a custom
 * property set inline would be the headless tier naming a color, and it is
 * shared because a chart and the legend keying it have to reach the same
 * twenty-four names.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Key, Series Key
 * @documentation https://fusion.dev/helix/components/legend
 *
 * @cssproperty --legend-direction - `row`, which wraps, or `column`.
 * @cssproperty --legend-gap - Space between entries.
 * @cssproperty --legend-swatch-size - Size of the color patch.
 * @cssproperty --legend-swatch-stroke - Width of the edge an `outlined` or
 *   `subtle` swatch is drawn with.
 */
@customElement('helix-legend')
export class HelixLegend extends HelixHeadlessLegend {
  static override styles: CSSResultGroup = [seriesStyles, styles]

  /**
   * How much ink the swatches claim.
   *
   * **The same axis as the chart's, with the same values, because a legend that
   * does not match its chart is worse than no legend.** A key whose swatches are
   * solid while the columns they key are outlined tells a reader the two are
   * different kinds of fact, which is the exact thing `outlined` on a chart
   * exists to say. `outlined` is the series color as an edge over a fill faded
   * toward the page, `subtle` is that edge over a wash, and absent is the filled
   * patch, per the rule that a reflected property takes no default.
   *
   * **The legend declares it rather than reading it off the chart.** A legend
   * has no reference to a chart: it points at a *table* through `for`, which is
   * what lets two charts share one, and the chart points at the same table
   * independently. Giving it a chart to read would make a list of names depend
   * on a drawing it is deliberately not part of, and would still not answer the
   * per-series case, where `outlined` is a set of names rather than one value.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * Which entries are glass rather than solid, by name.
   *
   * Matched as `outlined` is.
   */
  @property()
  glass?: string

  /**
   * What the swatches are made of.
   *
   * `glass` thins whatever emphasis drew, the way it does on a column, so a
   * legend beside a glass chart is in the same substance as the chart. Scaled by
   * `--helix-material-opacity`, so a theme that is more see-through everywhere is
   * more see-through here.
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
   * Which entries are drawn as an outline rather than a fill, by name.
   *
   * Space or comma separated and matched against the names this legend is
   * showing, which are the same names the chart matches its own `outlined`
   * against, since both read one table. So a chart and its key say the same
   * thing the same way: `outlined="Forecast"` on both.
   */
  @property()
  outlined?: string

  /**
   * Where the legend sits and which way its entries run.
   *
   * Absent is a wrapping row, which is what sits under a chart. `start` and
   * `end` stack the entries in a column, for a legend beside one.
   *
   * **This says which way the entries run and not where the element is**, which
   * is the honest limit of a component that is a sibling of the chart rather
   * than part of it. A legend cannot place itself relative to something it is
   * not inside, so the consumer still puts it above, below or beside and this
   * makes it lay out correctly once it is there.
   *
   * A `legend` slot on every chart is the obvious alternative and is worse: it
   * makes the legend's position a fact about the chart, so two charts sharing
   * one legend becomes impossible, and it puts a list inside a drawing that is
   * `aria-hidden`.
   */
  @property({ reflect: true })
  placement?: 'end' | 'start'

  /**
   * Which entries are drawn as a wash of their color, by name.
   *
   * Matched as `outlined` is.
   */
  @property()
  subtle?: string

  /**
   * Marks each entry with the treatment its name was given.
   *
   * After the update rather than during it, because the entries are what the
   * tier below rendered and matching happens against the names it chose to show.
   * The same shape `BarChart.updated` uses on its bars, and for the same reason:
   * a per-series answer cannot be a selector, since CSS cannot match an
   * attribute against a list.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)

    const showing = this.names().map((name) => name.trim().toLowerCase())
    const slots = (value: string | undefined): Set<number> =>
      new Set(
        (value ?? '')
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((name) => name.toLowerCase())
          .flatMap((name) => {
            const at = showing.indexOf(name)
            return at < 0 ? [] : [at]
          }),
      )

    const mark = (entry: Element, name: string, value: string | undefined): void => {
      if (value) {
        entry.setAttribute(`data-${name}`, value)
      } else {
        entry.removeAttribute(`data-${name}`)
      }
    }

    const outlined = slots(this.outlined)
    const subtle = slots(this.subtle)
    const glass = slots(this.glass)
    const entries = [...this.renderRoot.querySelectorAll('[part="entry"]')]
    for (const [at, entry] of entries.entries()) {
      mark(entry, 'emphasis', outlined.has(at) ? 'outlined' : subtle.has(at) ? 'subtle' : undefined)
      mark(entry, 'material', glass.has(at) ? 'glass' : undefined)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-legend': HelixLegend
  }
}
