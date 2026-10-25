import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToast } from '@fusion.dev/helix-headless/toast'
import type { CSSResultGroup } from 'lit'
import '../../button/index.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './toast-root.generated.css.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * Fixed to the window, in the top layer. The region spans a whole edge, so it
 * ignores the pointer and only the messages receive clicks. Content beside a
 * message stays clickable.
 *
 * Because the stack is in the top layer, an ancestor with `transform`,
 * `filter`, `contain`, or `overflow: hidden` does not move or clip it, and
 * while a modal dialog is open, the stack moves into it and shows above it,
 * where its messages stay pressable. Below a window of 30rem, each message
 * takes the whole width of the stack.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Toaster, Snackbar
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @cssproperty --toast-gap - Space between one message and the next.
 * @cssproperty --toast-inline-size - Width of a message, 22rem unless set, and the whole width of the stack below a window of 30rem.
 * @cssproperty --toast-inset - Distance from the edges of the window.
 */
@customElement('helix-toast')
export class HelixToast extends HelixHeadlessToast {
  /* So `add()` appends `helix-toast-item`, which this tier draws, and not the
     headless message. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast': HelixToast
  }
}
