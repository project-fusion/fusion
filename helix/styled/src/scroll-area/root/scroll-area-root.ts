import { customElement } from '@helix-io/core'
import { HelixHeadlessScrollArea } from '@helix-io/headless/scroll-area'
import type { CSSResultGroup } from 'lit'
import { styles } from './scroll-area-root.css.js'

/**
 * @summary A scrolling box that says there is more.
 *
 * @description
 * Presentation only: the fades on the edges the base class names, and a
 * scrollbar that belongs to the system rather than to the platform. Which edges
 * have content past them is measured by the base class.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Scroller, Overflow, Scroll container
 * @documentation https://helix.fusion.dev/components/scroll-area
 *
 * @cssproperty --scroll-area-fade - How deep the fades are, at both edges.
 * @cssproperty --scroll-area-fade-block-start - How deep the top one is, or `0` to drop it.
 * @cssproperty --scroll-area-fade-block-end - And the bottom one.
 * @cssproperty --scroll-area-fade-inline-start - How deep the leading sideways one is, or `0` to drop it.
 * @cssproperty --scroll-area-fade-inline-end - And the trailing one.
 * @cssproperty --scroll-area-fade-color - What they fade to, which is the ground behind.
 * @cssproperty --scroll-area-scrollbar - The scrollbar width keyword.
 * @cssproperty --scroll-area-thumb-color - The scrollbar's handle.
 * @cssproperty --scroll-area-track-color - And its track.
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
