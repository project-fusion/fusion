import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessButton } from '../../button/root/button-root.js'

/**
 * @summary A button whose content is an icon, named by its `label`.
 *
 * @description
 * Everything a button does, with one thing added and it is the reason this is
 * an element rather than a note on `Button`: **an icon-only control has no
 * accessible name unless it is given one.** A button whose content is a glyph
 * announces as "button" and nothing else, which is the single most common way a
 * toolbar becomes unusable without sight. `label` is not optional in practice,
 * and having a component that says so is what makes it reviewable.
 *
 * **Registered, so it can be rendered and not only subclassed.** Anything in
 * this tier needing an icon button, such as an announcement's dismiss control,
 * renders `helix-headless-icon-button` rather than reaching into the styled tier
 * for a tag that would never upgrade.
 *
 * Top-level rather than `Button.Icon`, because a namespace means composition
 * and an icon-only button is not part of a button. It is a button with
 * different content and a different shape, which makes it its own component.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Icon button, Square button
 * @documentation https://fusion.dev/helix/components/icon-button
 *
 * @slot - The icon.
 *
 * @csspart button - The inner button or anchor.
 */
@customElement('helix-headless-icon-button')
export class HelixHeadlessIconButton extends HelixHeadlessButton {}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-icon-button': HelixHeadlessIconButton
  }
}
