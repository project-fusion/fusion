import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScrollArea } from '@fusion.dev/helix-headless/scroll-area'
import type { CSSResultGroup } from 'lit'
import { styles } from './scroll-area-root.css.js'

/**
 * @summary A scrolling box that shows which edges have more content past them.
 *
 * @description
 * Presentation only: fades on the edges the base class reports, and a scrollbar
 * styled to match the design system. The base class measures which edges have
 * content past them.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Scroller, Overflow, Scroll container
 * @documentation https://fusion.dev/helix/components/scroll-area
 *
 * @cssproperty --scroll-area-fade - The depth of the fades at both edges.
 * @cssproperty --scroll-area-fade-block-end - The depth of the bottom fade, or `0` to remove it.
 * @cssproperty --scroll-area-fade-block-start - The depth of the top fade, or `0` to remove it.
 * @cssproperty --scroll-area-fade-color - The color the fades blend into, which is the background behind the box.
 * @cssproperty --scroll-area-fade-inline-end - The depth of the fade at the inline end, or `0` to remove it.
 * @cssproperty --scroll-area-fade-inline-start - The depth of the fade at the inline start, or `0` to remove it.
 * @cssproperty --scroll-area-scrollbar - The scrollbar width, as a `scrollbar-width` keyword.
 * @cssproperty --scroll-area-thumb-color - The color of the scrollbar's thumb.
 * @cssproperty --scroll-area-track-color - The color of the scrollbar's track.
 */
@customElement('helix-scroll-area')
export class HelixScrollArea extends HelixHeadlessScrollArea {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scroll-area': HelixScrollArea
  }
}
