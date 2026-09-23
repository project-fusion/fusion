import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLightboxItem } from '@fusion.dev/helix-headless/lightbox'
import type { CSSResultGroup } from 'lit'
import { styles } from './lightbox-item.css.js'

/**
 * @summary One thing a lightbox can show.
 *
 * @description
 * Presentation only: the box centers what it was given and holds it inside the
 * viewport rather than sizing it, because what is in here is the consumer's and
 * may be a picture, a frame of video or a chart. Which item is shown, and the
 * arithmetic that decides, is the base class.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases LightboxSlide, GalleryItem
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @cssproperty --lightbox-item-description-color - Color of the line under the content.
 * @cssproperty --lightbox-item-gap - Space between the content and the line under it.
 */
@customElement('helix-lightbox-item')
export class HelixLightboxItem extends HelixHeadlessLightboxItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-lightbox-item': HelixLightboxItem
  }
}
