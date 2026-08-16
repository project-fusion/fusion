import { customElement } from '@helix-io/core'
import { HelixBaseToast } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './toast-root.css.js'

/**
 * @summary The region messages arrive in, and the only thing that announces them.
 *
 * @description
 * Fixed to the window, and it catches nothing: the region spans a whole edge,
 * so a stack of one message in a corner would otherwise put an invisible bar
 * across everything beside it. The region is transparent to a pointer and the
 * messages take it back.
 *
 * **It belongs at the root of the application.** `position: fixed` is
 * positioned against the viewport only while no ancestor carries `transform`,
 * `filter`, `perspective` or `contain`, any of which makes that ancestor the
 * containing block instead, and it is still clipped by an ancestor with
 * `overflow: hidden`. That is a real constraint rather than a style note, and
 * it is the same fact that put every other floating surface in this library
 * into the top layer.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Toaster, Snackbar, Notifications
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @cssproperty --toast-inset - Distance from the edges of the window.
 * @cssproperty --toast-gap - Space between one message and the next.
 * @cssproperty --toast-inline-size - Width of a message.
 */
@customElement('helix-toast')
export class HelixToast extends HelixBaseToast {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toast': HelixToast
  }
}
