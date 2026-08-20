import { customElement } from '@helix-io/core'
import { HelixBaseTimelineItem } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-item.css.js'

/**
 * @summary One event on a timeline: when it happened, and what it was.
 *
 * @description
 * Presentation only: the rail down the side, the mark on it, and the line that
 * arrives at this entry from the one before.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Activity item, History entry, Event
 * @documentation https://helix.fusion.dev/components/timeline
 *
 * @cssproperty --timeline-marker-size - Diameter of the mark.
 * @cssproperty --timeline-rail-size - Width of the line.
 */
@customElement('helix-timeline-item')
export class HelixTimelineItem extends HelixBaseTimelineItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-timeline-item': HelixTimelineItem
  }
}
