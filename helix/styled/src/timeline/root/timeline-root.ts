import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeline } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { styles } from './timeline-root.css.js'

/**
 * @summary A record of what happened, in the order it happened.
 *
 * @description
 * Presentation only: the direction time runs in, and the spacing between one
 * event and the next. Every entry draws its own mark and its own line.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity feed, History, Changelog, Audit trail
 * @documentation https://helix.fusion.dev/components/timeline
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
