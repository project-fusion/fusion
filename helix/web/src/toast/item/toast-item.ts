import { customElement } from '@helix-io/core'
import { HelixBaseToastItem } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './toast-item.css.js'

/**
 * @summary One message in the toast region.
 *
 * @description
 * A surface with a shadow, because a toast sits over whatever the reader was
 * looking at rather than in it. The severity is a bar down the leading edge and
 * not a fill: a message is text to be read, and a colored panel behind it
 * costs contrast for something the mark already says.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @cssproperty --toast-item-inset - Space between the message's edge and its contents.
 */
@customElement('helix-toast-item')
export class HelixToastItem extends HelixBaseToastItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast-item': HelixToastItem
  }
}
