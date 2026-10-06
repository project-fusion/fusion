import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpeedDialItem } from '@fusion.dev/helix-headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { styles } from './speed-dial-item.css.js'

/**
 * @summary One action in a speed dial: an icon and a name beside it.
 *
 * @description
 * Presentation only: a round mark the size of a small control, with the name on
 * a chip beside it so it stays readable over whatever the dial floats over. The
 * base class handles its behavior.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Speed dial action, FAB action, Quick action
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @cssproperty --speed-dial-item-background-color - Fill of the round icon.
 * @cssproperty --speed-dial-item-color - Color of the icon.
 * @cssproperty --speed-dial-item-disabled-opacity - How faint a disabled action is drawn.
 * @cssproperty --speed-dial-item-hover-background-color - Fill of the round icon under the pointer.
 * @cssproperty --speed-dial-item-size - Edge length of the icon.
 * @cssproperty --speed-dial-label-background-color - Fill of the chip holding the action's name.
 * @cssproperty --speed-dial-label-color - Color of the action's name.
 * @cssproperty --speed-dial-label-font-size - Size of the action's name.
 * @cssproperty --speed-dial-shortcut-color - Color of the shortcut drawn after the action's name.
 */
@customElement('helix-speed-dial-item')
export class HelixSpeedDialItem extends HelixHeadlessSpeedDialItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial-item': HelixSpeedDialItem
  }
}
