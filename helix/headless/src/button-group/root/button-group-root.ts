import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * The host is the group, so `role="group"` sits on it through internals and
 * `label` names it. A group of buttons with no name is announced as a run of
 * separate controls, which is what the grouping exists to say it is not.
 *
 * It manages no focus. A group is not a toolbar: the APG toolbar pattern asks
 * for one tab stop with arrow keys inside it, and that is what Toolbar is for.
 * Here every button keeps its own tab stop, which is what a reader expects from
 * buttons sitting side by side.
 *
 * Buttons are slotted rather than wrapped, so they stay the consumer's own
 * elements and keep whatever appearance and size they were given.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Segmented buttons, Split button
 * @documentation https://helix.fusion.dev/components/button-group
 *
 * @slot - The buttons in the group.
 */
@customElement('helix-base-button-group')
export class HelixBaseButtonGroup extends HelixElement {
  /**
   * Accessible name for the group.
   *
   * On the host through internals, so an author's `aria-label` still overrides
   * it and nothing lands on the host that a consumer's markup did not have.
   */
  @property()
  label = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.role = 'group'
    this.internals.ariaLabel = this.label || null
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-button-group': HelixBaseButtonGroup
  }
}
