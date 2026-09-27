import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLightboxItem } from '@fusion.dev/helix-headless/lightbox'
import type { CSSResultGroup } from 'lit'
import { styles } from './lightbox-item.css.js'

/**
 * @summary One item a lightbox can show, such as a picture, a video frame, or a chart.
 *
 * @description
 * Presentation only. The box centers its content and keeps it within the
 * viewport without setting its size, because the content may be a picture, a
 * video frame, or a chart. The base class decides which item is shown.
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
