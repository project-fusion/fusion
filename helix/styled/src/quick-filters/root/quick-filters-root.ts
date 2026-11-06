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
 * @documentation https://fusion.dev/helix/components/quick-filters
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
