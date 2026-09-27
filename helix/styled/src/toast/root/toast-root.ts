import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToast } from '@fusion.dev/helix-headless/toast'
import type { CSSResultGroup } from 'lit'
import { styles } from './toast-root.css.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * Fixed to the window. The region spans a whole edge, so it ignores the pointer
 * and only the messages receive clicks. Content beside a message stays
 * clickable.
 *
 * **Place the region at the root of your application.** `position: fixed`
 * positions against the viewport only while no ancestor has `transform`,
 * `filter`, `perspective`, or `contain`. Any of these makes that ancestor the
 * containing block, and an ancestor with `overflow: hidden` still clips the
 * region. The other floating surfaces in Helix use the top layer for the same
 * reason.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Toaster, Snackbar
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @cssproperty --toast-gap - Space between one message and the next.
 * @cssproperty --toast-inline-size - Width of a message.
 * @cssproperty --toast-inset - Distance from the edges of the window.
 */
@customElement('helix-toast')
export class HelixToast extends HelixHeadlessToast {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast': HelixToast
  }
}
