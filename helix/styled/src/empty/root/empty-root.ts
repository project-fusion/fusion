import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessEmpty } from '@fusion.dev/helix-headless/empty'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
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
 * @documentation https://fusion.dev/helix/components/empty
 *
 * @cssproperty --empty-padding - Space around the whole block.
 */
@customElement('helix-empty')
export class HelixEmpty extends HelixHeadlessEmpty {
  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-empty': HelixEmpty
  }
}
