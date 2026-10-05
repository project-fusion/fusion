import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimelineGroup } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-group.css.js'

/**
 * @summary A run of timeline entries under a heading, such as a day.
 *
 * @description
 * The heading sits at the start edge, over the entries, in the small heavy
 * type of a section label, and the space under one group is the space between
 * two entries.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Day, Section, Date group
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @cssproperty --timeline-group-heading-color - The color of the heading.
 */
@customElement('helix-timeline-group')
export class HelixTimelineGroup extends HelixHeadlessTimelineGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-timeline-group': HelixTimelineGroup
  }
}
