import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScrollArea } from '@fusion.dev/helix-headless/scroll-area'
import type { CSSResultGroup } from 'lit'
import { styles } from './scroll-area-root.css.js'

/** How far each edge's fade reaches into the viewport, which the mask reads. */
const DEPTHS = [
  '--_scroll-area-depth-block-end',
  '--_scroll-area-depth-block-start',
  '--_scroll-area-depth-inline-end',
  '--_scroll-area-depth-inline-start',
]

/**
 * Registers the depths, once, so the browser can animate them.
 *
 * **From script, because a sheet cannot.** An `@property` rule inside a shadow
 * root is ignored, and a gradient stop only interpolates once its property is
 * registered as a length. A registration is the document's, so it reaches
 * every scroll area's shadow root. Where the browser has no
 * `registerProperty`, or on the server, the fades change at once.
 */
let registered = false
function registerDepths(): void {
  if (registered || typeof CSS === 'undefined' || !('registerProperty' in CSS)) {
    return
  }
  registered = true
  for (const name of DEPTHS) {
    try {
      CSS.registerProperty({
        inherits: false,
        initialValue: '0px',
        name,
        syntax: '<length-percentage>',
      })
    } catch {
      // Registered already, by another copy of this module on the page.
    }
  }
}

/**
 * @summary A scrolling box that shows which edges have more content past them.
 *
 * @description
 * Presentation only: fades on the edges the base class reports, and a scrollbar
 * styled to match the design system. The base class measures which edges have
 * content past them.
 *
 * **The content fades out toward each edge that has more past it.** The fade
 * is a mask on the viewport, so the surface behind the scroll area shows
 * through it: the page, a card, or a translucent pane. Set the depth with
 * `--scroll-area-fade`, or one edge's depth with its own property, and use `0`
 * to keep an edge from fading. A scrollbar that takes room beside the content
 * stays out of the mask.
 *
 * **Set `--scroll-area-fade-color` to paint the fades.** Each fade is then a
 * gradient from that color over the content, and there is no mask. Use it for
 * a scroll area on a solid ground, in the ground's color or one of your own.
 *
 * Under `scrollbars`, the browser's scrollbar is hidden and the component's own
 * are drawn over the content at the edge, in the same colors.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Scroller, Overflow, Scroll container
 * @documentation https://fusion.dev/helix/components/scroll-area
 *
 * @cssproperty --scroll-area-fade - The depth of the fade at each edge.
 * @cssproperty --scroll-area-fade-block-end - The depth of the bottom fade, or `0` to remove it.
 * @cssproperty --scroll-area-fade-block-start - The depth of the top fade, or `0` to remove it.
 * @cssproperty --scroll-area-fade-color - The color to paint the fades in, as a gradient over the content at each edge. Unset, the fades are a mask.
 * @cssproperty --scroll-area-fade-inline-end - The depth of the fade at the inline end, or `0` to remove it.
 * @cssproperty --scroll-area-fade-inline-start - The depth of the fade at the inline start, or `0` to remove it.
 * @cssproperty --scroll-area-scrollbar - The scrollbar width, as a `scrollbar-width` keyword.
 * @cssproperty --scroll-area-scrollbar-size - The thickness of each scrollbar drawn under `scrollbars`, and the size of the corner.
 * @cssproperty --scroll-area-thumb-color - The color of the scrollbar's thumb. Defaults to `--helix-scrollbar-thumb-color`.
 * @cssproperty --scroll-area-thumb-hover-color - The color of the browser's thumb while the pointer is over the scroll area, and of a thumb drawn under `scrollbars` while the pointer is over it. Defaults to `--helix-scrollbar-thumb-hover-color`.
 * @cssproperty --scroll-area-thumb-min-size - The shortest a thumb drawn under `scrollbars` gets, however long the content.
 * @cssproperty --scroll-area-track-color - The color of the scrollbar's track. Defaults to `--helix-scrollbar-track-color`.
 */
@customElement('helix-scroll-area')
export class HelixScrollArea extends HelixHeadlessScrollArea {
  static override styles: CSSResultGroup = styles

  override connectedCallback(): void {
    super.connectedCallback()
    registerDepths()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scroll-area': HelixScrollArea
  }
}
