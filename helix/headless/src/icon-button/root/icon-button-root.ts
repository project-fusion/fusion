import { customElement, type Placement } from '@fusion.dev/helix-core'
import type { TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessButton } from '../../button/root/button-root.js'
import '../../tooltip/index.js'

/**
 * @summary A button whose content is an icon, named by its `label`.
 *
 * @description
 * A button with an icon for its content. Always set `label`: an icon-only
 * control has no accessible name unless you give it one, and a button whose
 * content is a glyph is announced as "button" and nothing else. A separate
 * component with a `label` makes the name something a review can check.
 *
 * The element is registered, so other headless components can render
 * `helix-headless-icon-button`, for example as an announcement's dismiss
 * control. They do not depend on a styled tag, which would never upgrade in
 * this tier.
 *
 * Icon Button is a top-level component. A namespace such as `Button.Icon` would
 * mean a part of a button, and an icon-only button is a complete button with
 * different content and a different shape.
 *
 * **Keyboard.** Enter and Space press the button, as `Button`'s do.
 *
 * **The tooltip.** The button shows its `label` in a tooltip on hover and
 * focus, since a glyph alone does not say what it does to someone who can see
 * it either. `tooltip="none"` draws none. A button that is already the trigger
 * of a tooltip of yours, one you wrap it in, shows yours alone, so a tooltip
 * with more to say, such as a shortcut, replaces this one rather than stacking
 * on it. The tooltip does not also describe the button, since its words are
 * the button's name.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Icon button, Square button
 * @documentation https://fusion.dev/helix/components/icon-button
 *
 * @slot - The icon.
 *
 * @csspart button - The inner button.
 */
@customElement('helix-headless-icon-button')
export class HelixHeadlessIconButton extends HelixHeadlessButton {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-icon-button': { pendingLabel: 'Wird geladen' } })`.
   */
  static override words = 'helix-icon-button'

  /**
   * When the tooltip shows: `full` on hover and focus, and `none` never.
   * `copy` is for a button that reports a result after a press, as Copy
   * Button does, and shows the bubble only then; a button with no result to
   * report shows none under it.
   *
   * Unset is `full`, and the attribute stays absent until you write it.
   */
  @property()
  tooltip?: 'copy' | 'full' | 'none'

  /**
   * The side the tooltip prefers. It moves to another side where this one
   * does not fit.
   */
  @property({ attribute: 'tooltip-placement' })
  tooltipPlacement: Placement = 'top'

  /**
   * Whether the button is the trigger of a tooltip it sits in, which then
   * speaks for it. Read when it connects, since that is when it has a parent.
   */
  private wrapped = false

  override connectedCallback(): void {
    super.connectedCallback()
    const wrapped = this.parentElement?.closest('helix-tooltip, helix-headless-tooltip') != null
    if (wrapped !== this.wrapped) {
      this.wrapped = wrapped
      this.requestUpdate()
    }
  }

  protected override render(): TemplateResult {
    return this.renderTooltip(super.render())
  }

  /**
   * The bubble the button sits inside, behind a seam, as Copy Button's is.
   *
   * Always drawn where it is drawn at all, and empty where it has nothing to
   * say, so the markup a server renders and the markup the page hydrates are
   * the same whichever tooltip the button turns out to sit in.
   */
  protected renderTooltip(control: TemplateResult): TemplateResult {
    if (this.tooltip === 'none') {
      return control
    }
    const content = this.wrapped || this.tooltip === 'copy' ? '' : (this.label ?? '')
    return html`<${this.tag('tooltip')} content=${content} placement=${this.tooltipPlacement}
    exportparts="arrow: tooltip-arrow, surface: tooltip-surface">${control}</${this.tag('tooltip')}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-icon-button': HelixHeadlessIconButton
  }
}
