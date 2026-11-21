import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessQuickFilters } from '@fusion.dev/helix-headless/quick-filters'
import type { CSSResultGroup } from 'lit'
import { styles } from './quick-filters-root.css.js'

/**
 * @summary A row of presets for a Data Table, each a partial view with a count, and a button that saves the view.
 *
 * @description
 * The presets sit in a sunken track, and the one the view holds is raised out
 * of it. Each count is muted after its name, and Save view is drawn in the
 * primary color at the end of the track.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Saved views, Presets, View tabs
 * @use Saved views of a Data Table, each one press away, with how many rows each shows.
 * @instead tabs - Panels of different content, one shown at a time.
 * @instead filter-input - Filters you type and combine yourself.
 * @anatomy preset
 * @anatomy count
 * @anatomy save
 * @practice Give each preset its `count` for a table in server mode. - A count comes from the rows the table holds, and a table in server mode holds one page.
 * @practice Set `view-key`, or keep a saved view from the save event yourself. - Without a key, Save view keeps nothing.
 * @documentation https://fusion.dev/design/components/quick-filters
 *
 * @cssproperty --quick-filters-background-color - The fill of the track the presets sit in.
 * @cssproperty --quick-filters-pressed-background-color - The fill of the preset the view holds.
 */
@customElement('helix-quick-filters')
export class HelixQuickFilters extends HelixHeadlessQuickFilters {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-quick-filters': HelixQuickFilters
  }
}
