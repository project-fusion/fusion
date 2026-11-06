import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeline } from '@fusion.dev/helix-headless/timeline'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './timeline-root.generated.css.js'

/**
 * @summary A list of events, in the order they happened.
 *
 * @description
 * Sets the direction time runs in and the spacing between events. Each entry
 * draws its own mark and line.
 *
 * `layout` and `orientation` move where the entries are drawn, and never the
 * order they are read in, which is the order you write them in:
 *
 * - Unset, the line runs down the start edge, with each time over what
 *   happened.
 * - `layout="opposite"` runs the line down the middle, with each time on the
 *   start side and what happened on the end side.
 * - `layout="alternate"` runs the line down the middle, with the first entry on
 *   the end side, the second on the start side, and so on.
 * - `orientation="horizontal"` runs the line across the top, with the entries
 *   side by side in the order they are read, and the time over what happened
 *   under each mark. Use it for a few entries, since they share the width.
 *   An entry is never narrower than its longest word, so a timeline with no
 *   room for its entries overflows. Put it in a Scroll Area with
 *   `orientation="horizontal"` to scroll it sideways.
 *
 * An entry's custom properties, such as `--timeline-rail-color` and
 * `--timeline-marker-size`, inherit, so setting them on the timeline changes
 * every entry in it.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity feed, History, Changelog, Audit trail
 * @use Events in the order they happened, such as a deployment's history.
 * @instead notifications - Events you mark read and come back to.
 * @instead steps - The stages of a task still under way, such as a checkout.
 * @instead log - Lines of output that arrive while you watch.
 * @anatomy item
 * @anatomy marker
 * @anatomy time
 * @anatomy content
 * @practice Write the entries in the order the events happened, oldest or newest first. - The reading order is the order you write them in, in every layout.
 * @practice {grouped} Group entries by date with `Timeline.Group`. - The group puts a heading such as Today over its entries.
 * @practice Set `loading` while you fetch more entries, and put a button that asks for more after the timeline. - The timeline is busy, and an entry after the last says Loading.
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @cssproperty --timeline-gap - Space between one entry and the next.
 */
@customElement('helix-timeline')
export class HelixTimeline extends HelixHeadlessTimeline {
  static override styles: CSSResultGroup = styles

  /**
   * Where the entries sit beside the line: `opposite` puts the times on one
   * side and what happened on the other, and `alternate` puts every other
   * entry on the other side. Unset, the line runs down the start edge.
   *
   * Down the page only: across the page it is set aside.
   */
  @property({ reflect: true })
  layout?: 'alternate' | 'opposite'

  /**
   * Which way time runs: `horizontal` lays the entries across the page. Unset,
   * they run down it.
   */
  @property({ reflect: true })
  orientation?: 'horizontal'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-timeline': HelixTimeline
  }
}
