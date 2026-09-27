import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimelineItem } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-item.css.js'

/**
 * @summary One event on a timeline: when it happened, and what it was.
 *
 * @description
 * Draws the rail down the side, the mark on it, and the line that arrives from
 * the previous entry.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity item, History entry, Event
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @cssproperty --timeline-marker-radius - How round the mark is. Zero is a square, and half its size is a disc.
 * @cssproperty --timeline-marker-size - Edge length of the mark.
 * @cssproperty --timeline-rail-size - Width of the line.
 */
@customElement('helix-timeline-item')
export class HelixTimelineItem extends HelixHeadlessTimelineItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-timeline-item': HelixTimelineItem
  }
}
