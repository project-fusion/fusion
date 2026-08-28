import { customElement } from '@helix-io/core'
import { HelixHeadlessSkeleton } from '@helix-io/headless/skeleton'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './skeleton-root.css.js'

/**
 * @summary Stands in for content that has not arrived.
 *
 * @description
 * A sweep rather than a pulse. A block fading in and out reads as something
 * broken; a highlight traveling across it reads as work in progress, and it is
 * the same one property animating either way.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @documentation https://helix.fusion.dev/components/skeleton
 *
 * @csspart skeleton - The placeholder surface.
 *
 * @cssproperty --skeleton-size - Diameter of the circle shape.
 */
@customElement('helix-skeleton')
export class HelixSkeleton extends HelixHeadlessSkeleton {
  /**
   * What the missing content is shaped like.
   *
   * Unset is a block, which is what most missing things are.
   */
  @property({ reflect: true })
  shape?: 'text' | 'circle'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-skeleton': HelixSkeleton
  }
}
