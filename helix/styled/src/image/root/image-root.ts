import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessImage } from '@fusion.dev/helix-headless/image'
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
 * @status stable
 * @category media
 * @aliases Picture, Img, Figure
 * @documentation https://fusion.dev/helix/components/image
 *
 * @cssproperty --image-aspect - The ratio of the box, as `16 / 9`.
 * @cssproperty --image-fit - How the picture fills it.
 * @cssproperty --image-placeholder-color - The resting surface behind both stand-ins.
 * @cssproperty --image-position - Which part survives a crop.
 * @cssproperty --image-radius - Corner radius, under `shape="rounded"`.
 */
@customElement('helix-image')
export class HelixImage extends HelixHeadlessImage {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the corners are cut.
   *
   * The axis and not a boolean, because `rounded` is a registered word and a
   * private spelling of a registry question is what `appearance` was retired
   * for. Not a radius either: the radius is a token and the question a consumer
   * is answering is whether this picture is a card's surface or a page's.
   * `--image-radius` moves it for the case that is neither.
   */
  @property({ reflect: true })
  shape?: 'rounded'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-image': HelixImage
  }
}
