import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTabs } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tabs-root.css.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * One mark travels between the tabs rather than each of them filling and
 * emptying in turn. A fill that swaps is two things changing at once and reads
 * as a flicker; one that moves is a single object the eye follows, and it says
 * where the current tab was as well as where it is. `Navigation` marks its
 * destinations the same way and for the same reason.
 *
 * What the mark is depends on `variant`: unset it is a raised pill on the
 * selected tab with nothing behind the row, `underlined` makes it a bar along
 * the bottom of the strip on a rule, and `segmented` grows it to the tab's own
 * box inside a sunken track.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tabs, which are this element's own children.
 * @slot panels - The panels, which are this element's own children. A wrapper around them is assigned to the slot and pairs with nothing, since the pairing walks these children rather than the slot's tree.
 *
 * @csspart panels - The panel container.
 * @csspart tabs - The tab list.
 */
@customElement('helix-tabs')
export class HelixTabs extends HelixHeadlessTabs {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tabs': HelixTabs
  }
}
