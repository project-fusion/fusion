import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One measurement, with a label that names what it measures.
 *
 * @description
 * The label comes first in the markup and the value after it, so a screen
 * reader reads what the figure counts before the number. Visually, the number
 * stands out either way.
 *
 * Both are bare slots. An element that assigned itself a slot on connect would
 * add an attribute after upgrade, which markup rendered on the server by React
 * does not have.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @slot - The value.
 * @slot label - What the value measures.
 * @slot unit - The unit, shown beside the value.
 */
@customElement('helix-headless-stat')
export class HelixHeadlessStat extends HelixElement {
  /**
   * Which way the label and the value are arranged.
   *
   * Absent is a column, the label over the number, which is how a figure is read
   * on a dashboard: the words say what is coming and the number answers.
   * `column-reverse` puts the number first, which is right where the number is
   * the headline and the label is a caption under it.
   *
   * The row directions set them side by side, for a figure in a line of text or
   * a narrow strip where a stacked pair would be two lines of almost nothing.
   *
   * A property rather than a `Flex` around it, because the unit has to stay on
   * the value's baseline whichever way the pair goes, and only this element
   * knows which of its children the unit belongs to.
   *
   * **`Trend` has a `direction` too, and there it means which way a number
   * moved:** `up`, `down` or `neutral`. A Stat and a Trend are often written
   * side by side, so watch for the mix-up. On a Stat those three words are not
   * layouts, and the pair stays the column.
   *
   * **Optional rather than defaulted to `column`, which is not a style
   * preference.** A reflecting property with a default writes its attribute onto
   * the host the moment the element upgrades, and the host is markup the
   * consumer rendered: React compares what it rendered against what is there and
   * reports a hydration mismatch. The absent attribute is the column, which the
   * stylesheet reads as the base case, and the server spec asserts the host
   * carries nothing nobody wrote.
   */
  @property({ reflect: true })
  direction?: 'column-reverse' | 'row' | 'row-reverse'

  protected override render(): TemplateResult {
    return html`<slot name="label"></slot>
      <slot></slot>
      <slot name="unit"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat': HelixHeadlessStat
  }
}
