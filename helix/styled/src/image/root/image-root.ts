import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessImage } from '@fusion.dev/helix-headless/image'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './image-root.css.js'

/**
 * @summary An image that shows a placeholder while it loads and a fallback if it fails.
 *
 * @description
 * The styled tier adds presentation only: the box the picture is given, how the
 * picture fills it, and the fade when it loads. The base class defines the
 * three states and when they change.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Picture, Img, Figure
 * @documentation https://fusion.dev/helix/components/image
 *
 * @cssproperty --image-aspect - The aspect ratio of the box, such as `16 / 9`.
 * @cssproperty --image-fade-duration - How long the picture takes to fade in once it loads. `0s` shows it at once.
 * @cssproperty --image-fallback-background-color - The background behind the fallback. Defaults to the placeholder's.
 * @cssproperty --image-fallback-color - The color of the fallback's text.
 * @cssproperty --image-fit - How the image fills the box, as an `object-fit` value.
 * @cssproperty --image-placeholder-color - The background behind the placeholder and the fallback.
 * @cssproperty --image-position - Which part of the image stays in view when it is cropped, as an `object-position` value.
 * @cssproperty --image-radius - The corner radius when `shape` is `rounded`.
 */
@customElement('helix-image')
export class HelixImage extends HelixHeadlessImage {
  static override styles: CSSResultGroup = styles

  /**
   * The shape of the corners. `rounded` rounds them.
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
