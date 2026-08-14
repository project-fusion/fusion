import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A set of rows, read as a set.
 *
 * @description
 * `role="list"` on the host, so the rows are counted and announced as "1 of 7"
 * rather than as seven unrelated passages. That count is the whole reason to
 * use a list rather than a stack of divs.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Rows, Stack, Menu
 * @documentation https://helix.fusion.dev/components/list
 *
 * @slot - The rows.
 */
@customElement('helix-base-list')
export class HelixBaseList extends HelixElement {
  /** Accessible name for the set. */
  @property()
  label = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.role = 'list'
    this.internals.ariaLabel = this.label || null
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-list': HelixBaseList
  }
}
