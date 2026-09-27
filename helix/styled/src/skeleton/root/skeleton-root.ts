import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSkeleton } from '@fusion.dev/helix-headless/skeleton'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './skeleton-root.css.js'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * Animates a highlight sweeping across the block, which reads as work in
 * progress. A block fading in and out can look broken.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @documentation https://fusion.dev/helix/components/skeleton
 *
 * @csspart skeleton - The placeholder shape.
 *
 * @cssproperty --skeleton-size - The diameter of the circle shape.
 */
@customElement('helix-skeleton')
export class HelixSkeleton extends HelixHeadlessSkeleton {
  /**
   * The shape of the placeholder: `text`, `circle`, or a block when unset.
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
