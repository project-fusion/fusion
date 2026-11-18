import { customElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessDrilldown } from '@fusion.dev/helix-headless/drilldown'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './drilldown-root.css.js'

/**
 * @summary A stack of pages that shows one at a time, with a back button.
 *
 * @description
 * Pages slide in the direction of travel, so you can tell whether you went
 * deeper or came back. Without motion, the panel only shows different text.
 *
 * The slide is a CSS animation, because the arriving page was not in the DOM on
 * the previous frame, so there is nothing to transition from. Under
 * `prefers-reduced-motion` the pages swap instantly, as they do in `Menu`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @cssproperty --drilldown-back-color - Color of the back button's icon.
 * @cssproperty --drilldown-back-hover-background-color - Fill of the back button under the pointer.
 * @cssproperty --drilldown-background-color - Fill behind the pages.
 * @cssproperty --drilldown-duration - How long a page takes to slide in, and the box to grow or shrink to it.
 * @cssproperty --drilldown-header-block-size - Height of the bar above a page.
 * @cssproperty --drilldown-header-border-color - Color of the rule under the bar above a page.
 * @cssproperty --drilldown-inline-size - Width of the region.
 * @cssproperty --drilldown-page-padding-block - Space above and below a page's rows.
 * @cssproperty --drilldown-title-color - Color of the page's name.
 * @cssproperty --drilldown-title-font-size - Size of the page's name.
 * @cssproperty --drilldown-title-font-weight - Weight of the page's name.
 * @cssproperty --drilldown-travel - How far a page slides as it arrives, along the line of text.
 */
@customElement('helix-drilldown')
export class HelixDrilldown extends HelixHeadlessDrilldown {
  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]

  /** The box's height before this update, to grow or shrink from. */
  private heightBefore: number | undefined

  /** The move from one height to the next, ended where it is if another starts. */
  private resizing: Animation | undefined

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.heightBefore = this.hasUpdated ? this.getBoundingClientRect().height : undefined
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    this.resize()
  }

  /**
   * **The box grows or shrinks to the page arriving**, over the slide's own
   * time, rather than snapping to its height as the page changes. A height is
   * a keyword here, `fit-content`, which no transition can follow, so the move
   * runs on the two measured heights and leaves the keyword in place after.
   */
  private resize(): void {
    const from = this.heightBefore
    this.heightBefore = undefined
    if (
      from === undefined ||
      typeof this.animate !== 'function' ||
      typeof ResizeObserver === 'undefined' ||
      reducedMotion()
    ) {
      return
    }
    /* **Measured once the page has laid out**, which is a frame's layout after
       this update: the rows of the page arriving are assigned in updates of
       their own, and measured here the box was 32 pixels taller than it came
       to rest at, so it grew past its place and snapped back. A new observer
       reports the size once, after layout and before the frame is painted. */
    const watcher = new ResizeObserver(() => {
      watcher.disconnect()
      const to = this.getBoundingClientRect().height
      if (Math.abs(to - from) < 1) {
        return
      }
      const style = getComputedStyle(this)
      const written =
        style.getPropertyValue('--drilldown-duration').trim() ||
        style.getPropertyValue('--helix-duration-normal').trim()
      const amount = Number.parseFloat(written)
      const duration = written.endsWith('ms') ? amount : amount * 1000
      if (!(duration >= 1)) {
        return
      }
      this.resizing?.cancel()
      this.resizing = this.animate([{ blockSize: `${from}px` }, { blockSize: `${to}px` }], {
        duration,
        easing: style.getPropertyValue('--helix-easing-decelerate').trim() || 'ease-out',
      })
    })
    watcher.observe(this)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drilldown': HelixDrilldown
  }
}
