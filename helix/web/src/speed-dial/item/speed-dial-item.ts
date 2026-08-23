import { customElement } from '@helix-io/core'
import { HelixBaseSpeedDialItem } from '@helix-io/headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { styles } from './speed-dial-item.css.js'

/**
 * @summary One action in a speed dial: a mark, and a name beside it.
 *
 * @description
 * Presentation only: a round mark the size of a small control, and the name on
 * a chip beside it so it can be read against whatever the dial is floating
 * over. Everything about choosing it is the base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases Speed dial action, FAB action, Quick action
 * @documentation https://helix.fusion.dev/components/speed-dial
 *
 * @cssproperty --speed-dial-item-size - Edge length of the mark.
 */
@customElement('helix-speed-dial-item')
export class HelixSpeedDialItem extends HelixBaseSpeedDialItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial-item': HelixSpeedDialItem
  }
}
