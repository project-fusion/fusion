import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessEmpty } from '@fusion.dev/helix-headless/empty'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './empty-root.css.js'

/**
 * @summary A message that a region has nothing in it, and the next step to take.
 *
 * @description
 * Centered with space around it. An empty view is the only thing on screen, and
 * pressed against the top edge it looks broken.
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
