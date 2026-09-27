import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLightbox } from '@fusion.dev/helix-headless/lightbox'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './lightbox-root.css.js'

/**
 * @summary A viewer that shows one item at a time over the page.
 *
 * @description
 * A lightbox fills the viewport while it is open. A `Dialog` stops short of the
 * edges because it sits over the page. The scrim is heavier than a dialog's,
 * because the content behind it is not meant to be read.
 *
 * The host sets `color-scheme: dark`, as `Video` does. The components in the
 * chrome are yours and resolve their own tokens, so without a scheme on the
 * region they would draw page-colored text on the black background.
 *
 * When there is no input, the chrome fades out and keeps its place in the
 * layout, so the picture does not change size.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Photo viewer, Image viewer, Gallery overlay
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the shown item changes, when the element already holds the new item.
 *
 * @cssproperty --lightbox-foreground - Color of the controls and text drawn over the content.
 * @cssproperty --lightbox-gap - Space between the header or footer and the content.
 * @cssproperty --lightbox-padding - Inset from the edges of the screen.
 * @cssproperty --lightbox-scrim - The overlay color on the page behind the viewer. Set it on the host, because a `var()` inside `::backdrop` cannot resolve a token.
 */
@customElement('helix-lightbox')
export class HelixLightbox extends HelixHeadlessLightbox {
  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-lightbox': HelixLightbox
  }
}
