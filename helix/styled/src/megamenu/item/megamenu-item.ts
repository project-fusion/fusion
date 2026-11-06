import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMegamenuItem } from '@fusion.dev/helix-headless/megamenu'
import type { CSSResultGroup } from 'lit'
import { styles } from './megamenu-item.generated.css.js'

/**
 * @summary One destination of a megamenu's panel, a link with a name, a line about it, and an icon.
 *
 * @description
 * Drawn as the `data-megamenu-item` recipe draws a link of your own: the
 * icon before the name and the line about it, the name strong, and the line
 * quiet, darkening under the pointer. A destination with no icon keeps a
 * dot before its name, filled while it is the page. **An item that holds
 * its name alone is drawn as a plain link of the panel**, as the recipe
 * draws a link in a `data-megamenu-group` with no `data-megamenu-item`.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu link, Flyout link
 * @documentation https://fusion.dev/helix/components/megamenu
 */
@customElement('helix-megamenu-item')
export class HelixMegamenuItem extends HelixHeadlessMegamenuItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-megamenu-item': HelixMegamenuItem
  }
}
