import { customElement } from '@helix-io/core'
import { HelixBaseImage } from '@helix-io/headless/image'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './image-root.css.js'

/**
 * @summary A picture that says whether it arrived.
 *
 * @description
 * Presentation only: the box the picture is given, how it fills it, and the
 * fade when it lands. What the three states are and when they change is the
 * base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Picture, Img, Figure
 * @documentation https://helix.fusion.dev/components/image
 *
 * @cssproperty --image-aspect - The ratio of the box, as `16 / 9`.
 * @cssproperty --image-fit - How the picture fills it.
 * @cssproperty --image-position - Which part survives a crop.
 * @cssproperty --image-radius - Corner radius, under `rounded`.
 * @cssproperty --image-placeholder-color - The resting surface behind both stand-ins.
 */
@customElement('helix-image')
export class HelixImage extends HelixBaseImage {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the corners are cut.
   *
   * A boolean rather than a radius, because the radius is a token and the
   * question a consumer is answering is whether this picture is a card's
   * surface or a page's. `--image-radius` moves it for the case that is
   * neither.
   */
  @property({ reflect: true, type: Boolean })
  rounded = false
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-image': HelixImage
  }
}
