import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessShortcutOverlay } from '@fusion.dev/helix-headless/shortcut-overlay'
import type { CSSResultGroup } from 'lit'
import '../../dialog/index.js'
import { styles } from './shortcut-overlay-root.css.js'

/**
 * @summary Shows every control's shortcut and what it does while a key is held.
 *
 * @description
 * Each badge is a small inverse plate, as a tooltip is, with the keys first
 * and the control's name after them, centered under the control.
 * The sheet is a `Dialog` listing each shortcut's name with its keys at the
 * end of the row.
 *
 * @since 0.216.0
 * @status experimental
 * @category navigation
 * @aliases Keyboard shortcuts, Shortcut hints, Key tips, Cheat sheet
 * @documentation https://fusion.dev/helix/components/shortcut-overlay
 *
 * @cssproperty --shortcut-overlay-badge-background-color - The badge's fill. Defaults to `surface-inverse`.
 * @cssproperty --shortcut-overlay-badge-border-width - The badge's edge. Defaults to `border-floating`, which a theme sets to zero where a shadow alone lifts a surface.
 * @cssproperty --shortcut-overlay-badge-color - The badge's text. Defaults to `foreground-inverse`.
 * @cssproperty --shortcut-overlay-badge-max-inline-size - The widest a badge grows before its name ends in an ellipsis. Defaults to 16rem.
 * @cssproperty --shortcut-overlay-badge-shadow - The badge's lift. Defaults to `shadow-floating`.
 */
@customElement('helix-shortcut-overlay')
export class HelixShortcutOverlay extends HelixHeadlessShortcutOverlay {
  static override styles: CSSResultGroup = [HelixHeadlessShortcutOverlay.styles, styles]

  static override tier = 'helix-'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-shortcut-overlay': HelixShortcutOverlay
  }
}
