import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

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
 * @status experimental
 * @aliases Metric, KPI, Figure
 * @documentation https://helix.fusion.dev/components/stat
 *
 * @slot - The value.
 * @slot label - What the value measures.
 * @slot unit - The unit, set beside the value.
 * @slot detail - A change, comparison, or note under the label.
 */
@customElement('helix-base-stat')
export class HelixBaseStat extends HelixElement {
  protected override render(): TemplateResult {
    return html`<slot name="label"></slot>
      <slot></slot>
      <slot name="unit"></slot>
      <slot name="detail"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-stat': HelixBaseStat
  }
}
