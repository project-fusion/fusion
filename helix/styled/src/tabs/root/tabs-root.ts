import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTabs } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tabs-root.css.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * One mark moves between the tabs to show the current one. A moving mark is a
 * single object that is easy to follow, and it shows where the selection came
 * from. A fill that switches from tab to tab changes two things at once and
 * looks like a flicker. `Navigation` marks its destinations the same way.
 *
 * The mark depends on `variant`:
 *
 * - Unset, it is a raised pill on the selected tab, with nothing behind the
 *   row.
 * - `underlined` makes it a bar along the bottom of the strip, on a rule.
 * - `segmented` makes it the size of the tab's box, inside a sunken track.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tabs, as direct children of this element.
 * @slot panels - The panels, as direct children of this element. Panels inside a wrapper are not paired with tabs, because pairing reads only the direct children.
 *
 * @csspart panels - The panel container.
 * @csspart tabs - The tab list.
 *
 * @cssproperty --tabs-gap - The space between tabs.
 * @cssproperty --tabs-indicator-color - The fill of the mark on the current tab: the bar under `underlined`, and the pill otherwise.
 * @cssproperty --tabs-indicator-thickness - The height of the bar under `underlined`.
 * @cssproperty --tabs-rule-color - The color of the rule under the row in `underlined`.
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
