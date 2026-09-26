import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToastItem } from '@fusion.dev/helix-headless/toast'
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
 * @status stable
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @cssproperty --toast-border-color - Color of the panel's edge.
 * @cssproperty --toast-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless your
 *   theme sets a border.
 * @cssproperty --toast-item-padding - Space between the message's edge and its contents.
 * @cssproperty --toast-shadow - Shadow under the panel. Follows `--helix-shadow-floating`. A
 *   floating surface can sit over any content, so it has a shadow by default.
 */
@customElement('helix-toast-item')
export class HelixToastItem extends HelixHeadlessToastItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast-item': HelixToastItem
  }
}
