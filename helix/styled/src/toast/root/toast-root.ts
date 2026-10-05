import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToast } from '@fusion.dev/helix-headless/toast'
import type { CSSResultGroup } from 'lit'
import { styles } from './toast-root.css.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * Fixed to the window, in the top layer. The region spans a whole edge, so it
 * ignores the pointer and only the messages receive clicks. Content beside a
 * message stays clickable.
 *
 * Because the stack is in the top layer, an ancestor with `transform`,
 * `filter`, `contain`, or `overflow: hidden` does not move or clip it, and a
 * message that arrives while a modal dialog is open shows above the dialog.
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
  /* So `add()` appends `helix-toast-item`, which this tier draws, and not the
     headless message. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast': HelixToast
  }
}
