import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeline } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-root.css.js'

/**
 * @summary A list of events, in the order they happened.
 *
 * @description
 * Sets the direction time runs in and the spacing between events. Each entry
 * draws its own mark and line.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity feed, History, Changelog, Audit trail
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @cssproperty --timeline-gap - Space between one entry and the next.
 */
@customElement('helix-timeline')
export class HelixTimeline extends HelixHeadlessTimeline {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-timeline': HelixTimeline
  }
}
