import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { ChartPointerController } from '../../controllers/chart-pointer-controller/chart-pointer-controller.js'
import { SourceController } from '../../controllers/source-controller/source-controller.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { type Row, readRows, readSeries, type Series } from '../../utils/read-series/read-series.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * How many colours the series palette has, and so where it starts over.
 *
 * Here rather than in each chart, which is what it was. Four families held the
 * same `const PALETTE = 24` and the legend held a fifth: when the palette went
 * from eight to twenty-four, one of them was missed and drew every ninth series
 * in the first color again while the legend beside it named the ninth. A
 * number two files have to agree on is a number that will stop agreeing.
 */
export const PALETTE = 24

/** The palette slot for the nth series, counting from one and wrapping. */
export const seriesIndex = (depth: number): number => (depth % PALETTE) + 1

/**
 * The public surface `MixinChartSource` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private or protected members (TS4094), and every
 * class extending `HelixElement` inherits protected `willUpdate` and `updated`.
 * Returning the class directly was tried and refused for exactly that.
 *
 * **Every member here is documented twice, and that is the convention rather
 * than an oversight.** TypeScript reads this interface; the analyzer reads the
 * inner class. Documented only here, `helix-convention-lint` failed the build
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
 * agreeing about, which is the mistake the `PALETTE` comment above already
 * records somebody making.
 *
 * The numbered twenty-four are the seam between the tiers: `chart/series.css`
 * points each at a semantic token, which is a decision and so belongs to the
 * styled tier, and a consumer on `headless` sets the same names to whatever
 * they like. The headless examples set them to a ramp of grays.
 *
 * @cssproperty --chart-series - The color of the mark this is set on. Written by the component, read by the sheet that paints.
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
   * The id of the table to read.
   *
   * Resolved through `getRootNode()`, so a chart inside another component's
   * shadow root names a table in that root rather than in the document. A
   * `<table>` or anything built from grid roles, including `helix-table`.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  for: string
  /**
   * The drawing's name, for a pointer resting on it.
   *
   * Absent falls back to the table's own caption, which is usually the right
   * words and is already written.
   */
  label: string
  /**
   * The columns of the table, one series each, or none if there is no table.
   */
  get series(): Series[]
  /**
   * What to call the drawing, the consumer's word or the table's own.
   */
  get named(): string
  /**
   * Every row of the table, with each cell's text as well as its number.
   */
  get rows(): Row[]
  /**
   * How many readings there are, which is what the pointer maps onto.
   */
  get readings(): number
  /**
   * Which reading a pointer is nearest, for a tooltip to sit on.
   */
  pointer: ChartPointerController
}

/**
 * The half of a chart that is about finding its numbers rather than drawing.
 *
 * Four families had written this out separately, and the row that asked for it
 * set the bar: two copies is a coincidence and three is a pattern. There were
 * five copies of `for`, four of `label` and three of the caption fallback by the
 * time the line and donut charts landed, which is why this arrives now and not
 * when the second chart did.
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
    /** Resolves `for` and re-renders when the table behind it changes. */
    protected readonly source = new SourceController(this)

    /**
     * Which reading a pointer is nearest, for a tooltip to sit on.
     *
     * Public for the same reason `series` and `named` are: a protected member
     * cannot be cast onto across unrelated classes, so it would be invisible to
     * every chart that needs it. Reading where a pointer is resting is a fair
     * thing to ask a chart anyway.
     */
    readonly pointer = new ChartPointerController(this)

    /**
     * The id of the table to read.
     *
     * Resolved through `getRootNode()`, so a chart inside another component's
     * shadow root names a table in that root rather than in the document. A
     * `<table>` or anything built from grid roles, including `helix-table`.
     *
     * **In React this arrives as a property and not as an attribute**, the way
     * `Tooltip.for` does, so it does not reflect and nothing styles on it.
     */
    @property()
    for = ''

    /**
     * The drawing's name, for a pointer resting on it.
     *
     * Absent falls back to the table's own caption, which is usually the right
     * words and is already written.
     */
    @property()
    label = ''

    /**
     * Re-resolves when the chart is pointed at a different table.
     *
     * `SourceController` watches whatever it resolved on connect, and nothing
     * tells it the id changed. `BarChart` had this and `LineChart` and
     * `DonutChart` did not, which is the kind of difference that survives
     * precisely because each file looked complete on its own: pointing a bar
     * chart at a second table worked and pointing a line chart at one left it
     * drawing the first. Extracting the four found it.
     */
    protected override willUpdate(changed: PropertyValues<this>): void {
      super.willUpdate(changed)
      if (changed.has('for')) {
        this.source.watch()
      }
    }

    /** The columns of the table, one series each, or none if there is no table. */
    get series(): Series[] {
      const element = this.source.element
      return element ? readSeries(element) : []
    }

    /**
     * What to call the drawing, the consumer's word or the table's own.
     *
     * The fallback is the reason this is shared rather than copied: a caption is
     * already written, already the right words, and already the thing a reader
     * of the table sees. A chart that made the consumer say it twice would be
     * asking for the second one to drift.
     */
    get named(): string {
      return this.label || this.source.element?.querySelector('caption')?.textContent?.trim() || ''
    }

    /**
     * Every row of the table, with each cell's text as well as its number.
     *
     * This is where a tooltip's content comes from, and it is deliberately not
     * `series`. A chart draws numbers; a reader resting a pointer on one wants
     * what the table says, which is `$128k` and not `128000`, and often wants
     * the column beside it that nothing plotted at all.
     */
    get rows(): Row[] {
      const element = this.source.element
      return element ? readRows(element) : []
    }

    /** How many readings there are, which is what the pointer maps onto. */
    get readings(): number {
      return this.rows.length
    }
  }

  return ChartSourceElement as T & Constructor<MixinChartSourceInterface>
}
