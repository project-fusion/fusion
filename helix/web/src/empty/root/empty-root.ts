import { customElement } from '@helix-io/core'
import { HelixBaseEmpty } from '@helix-io/headless/empty'
import type { CSSResultGroup } from 'lit'
import { styles } from './empty-root.css.js'

/**
 * @summary Says that a region has nothing in it, and what to do about it.
 *
 * @description
 * Centered and given room, because an empty view is the only thing on screen
 * and crowding it against the top edge makes the region look broken rather than
 * empty.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://helix.fusion.dev/components/empty
 *
 * @cssproperty --empty-inset - Space around the whole block.
 */
@customElement('helix-empty')
export class HelixEmpty extends HelixBaseEmpty {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-empty': HelixEmpty
  }
}
