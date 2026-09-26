import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A row of related measurements.
 *
 * @description
 * A group rather than a list, because the figures are read together and their
 * order carries no meaning: a list would announce "1 of 4" for a set where the
 * position is not information.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Metrics, KPIs, Figures
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @slot - The stats.
 */
@customElement('helix-headless-stat-group')
export class HelixHeadlessStatGroup extends HelixElement {
  /**
   * Accessible name for the group.
   */
  @property()
  label = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat-group': HelixHeadlessStatGroup
  }
}
