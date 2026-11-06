import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimelineItem } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-item.generated.css.js'

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
 * @cssproperty --timeline-column-gap - Space between the rail and the time and what happened.
 * @cssproperty --timeline-marker-color - The color of the mark on an entry with no `tone`. A `tone` colors the mark itself.
 * @cssproperty --timeline-marker-radius - How round the mark is. Zero is a square, and half its size is a disc.
 * @cssproperty --timeline-marker-size - Edge length of the mark.
 * @cssproperty --timeline-rail-color - The color of the line.
 * @cssproperty --timeline-rail-size - Width of the line.
 * @cssproperty --timeline-time-color - The color of the time.
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
