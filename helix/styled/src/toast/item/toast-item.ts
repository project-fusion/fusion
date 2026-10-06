import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToastItem } from '@fusion.dev/helix-headless/toast'
import type { CSSResultGroup } from 'lit'
import { styles } from './toast-item.css.js'

/**
 * @summary One message in the toast region.
 *
 * @description
 * A surface with a shadow, because a toast sits over the page content. The
 * severity is a bar along the leading edge, so the message text keeps full
 * contrast on the surface.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @cssproperty --toast-background-color - The panel's color. Follows `--helix-color-surface-overlay`.
 * @cssproperty --toast-border-color - Color of the panel's edge.
 * @cssproperty --toast-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless your
 *   theme sets a border.
 * @cssproperty --toast-color - Color of the message's text.
 * @cssproperty --toast-description-color - Color of the line in the `description` slot, under the heading.
 * @cssproperty --toast-dismiss-color - Color of the dismiss control's mark at rest.
 * @cssproperty --toast-font-size - Size of the message's text. The first line's controls and mark stay centered on it.
 * @cssproperty --toast-heading-weight - Weight of the heading in the `heading` slot.
 * @cssproperty --toast-item-padding - Space between the message's edge and its contents.
 * @cssproperty --toast-radius - Rounding of the panel's corners.
 * @cssproperty --toast-shadow - Shadow under the panel. Follows `--helix-shadow-floating`. A
 *   floating surface can sit over any content, so it has a shadow by default.
 * @cssproperty --toast-timer-size - Thickness of the bar that counts down a timed message.
 * @cssproperty --toast-tone-color - Color of the mark and the countdown bar. Unset, each `tone`
 *   takes its own color, so set it per tone, as in `helix-toast-item[tone="danger"]`.
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
