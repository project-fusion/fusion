import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One measurement, with the word for what it measures.
 *
 * @description
 * Label first in the markup and the value after it, which is the reading order
 * a screen reader takes and the order a caption sits above a figure. The eye
 * lands on the number either way, because the number is the loud thing; a
 * reader hearing it needs to know what it counts before hearing how many.
 *
 * This paragraph said the opposite, value first and label after, on a render
 * that has always emitted the label slot first: the description was published
 * to two tiers and shipped into the generated types, and the component was
 * right and the sentence was wrong.
 *
 * Both are bare slots. An element whose only job is to assign itself a slot on
 * connect gives its own host an attribute after upgrade, which a React
 * consumer's server markup never had.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://helix.fusion.dev/components/stat
 *
 * @slot - The value.
 * @slot label - What the value measures.
 * @slot unit - The unit, set beside the value.
 */
@customElement('helix-base-stat')
export class HelixBaseStat extends HelixElement {
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
   * A property rather than a `helix-flex` around it, because the unit has to
   * stay on the value's baseline whichever way the pair goes, and only this
   * element knows which of its children the unit belongs to.
   *
   * **Optional rather than defaulted to `column`, which is not a style
   * preference.** A reflecting property with a default writes its attribute onto
   * the host the moment the element upgrades, and the host is markup the
   * consumer rendered: React compares what it rendered against what is there and
   * reports a hydration mismatch. The absent attribute is the column, which the
   * stylesheet reads as the base case. The existing server spec caught this,
   * being the one that asserts the host carries nothing nobody wrote.
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
    'helix-base-stat': HelixBaseStat
  }
}
