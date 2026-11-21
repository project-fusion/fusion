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
 * @use A page with many keyboard shortcuts, each shown on its control while you hold a key.
 * @instead kbd - One key or chord written inside a sentence.
 * @instead command - Commands you find by typing.
 * @anatomy badge
 * @anatomy badge-keys
 * @anatomy badge-name
 * @practice Set `sheet-keys` to another chord where your page answers `?` with its own help. - Many apps, GitHub and Gmail among them, give `?` to their own help, and one press then opens both.
 * @documentation https://fusion.dev/design/components/shortcut-overlay
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
