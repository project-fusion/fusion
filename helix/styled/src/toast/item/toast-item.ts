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
 * @status experimental
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @cssproperty --toast-border-color - Color of the panel's edge.
 * @cssproperty --toast-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --toast-item-padding - Space between the message's edge and its contents.
 * @cssproperty --toast-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
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
