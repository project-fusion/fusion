import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessButton } from '../../button/root/button-root.js'

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
export class HelixHeadlessIconButton extends HelixHeadlessButton {}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-icon-button': HelixHeadlessIconButton
  }
}
