import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMegamenuGroup } from '@fusion.dev/helix-headless/megamenu'
import type { CSSResultGroup } from 'lit'
import { styles } from './megamenu-group.generated.css.js'

/**
 * @summary A column of a megamenu's panel: a heading and the destinations under it.
 *
 * @description
 * Drawn as the `data-megamenu-group` and `data-megamenu-heading` recipes
 * draw your own: a column of destinations under a small, quiet heading, its
 * icon hung back so the name starts where the destinations' names start.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu column, Flyout section
 * @documentation https://fusion.dev/helix/components/megamenu
 */
@customElement('helix-megamenu-group')
export class HelixMegamenuGroup extends HelixHeadlessMegamenuGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-megamenu-group': HelixMegamenuGroup
  }
}
