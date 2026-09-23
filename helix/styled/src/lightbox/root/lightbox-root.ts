import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLightbox } from '@fusion.dev/helix-headless/lightbox'
import type { CSSResultGroup } from 'lit'
import { styles } from './lightbox-root.css.js'

/**
 * @summary A viewer that opens one thing over the page.
 *
 * @description
 * **A takeover rather than a panel, which is the whole difference from
 * `Dialog`.** A dialog is a thing over the page and stops short of the edges to
 * say so; a lightbox is the page for as long as it is open. The scrim is heavier
 * for the same reason: what is behind it is not meant to be read.
 *
 * **A dark region that says so once**, with `color-scheme: dark` on the host,
 * which is `Video`'s answer to the same problem: the chrome is the consumer's
 * own components and they resolve their own tokens, so without a scheme on the
 * region they draw page-colored ink on a black room and disappear into it.
 *
 * The chrome fades rather than leaves while the reader is still, because a bar
 * that is removed from the layout takes the picture's size with it and the
 * reader watches it jump every time they stop moving.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Photo viewer, Image viewer, Gallery overlay
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @event {HelixActivateEvent} helix-activate - Fired once the shown item has moved, so the element already holds it.
 *
 * @cssproperty --lightbox-foreground - Color of the chrome drawn over the content.
 * @cssproperty --lightbox-gap - Space between the chrome and the content.
 * @cssproperty --lightbox-padding - Inset from the edges of the screen.
 * @cssproperty --lightbox-scrim - The wash over the page behind the viewer. Set on the host, where a token still resolves: a `var()` written inside `::backdrop` cannot see one.
 */
@customElement('helix-lightbox')
export class HelixLightbox extends HelixHeadlessLightbox {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-lightbox': HelixLightbox
  }
}
