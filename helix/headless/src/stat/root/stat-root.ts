import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary One measurement, with the word for what it measures.
 *
 * @description
 * Value first in the markup and label after it, because that is the reading
 * order a figure wants: the number is what the eye lands on and the label is
 * what tells it what it landed on.
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
