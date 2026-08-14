import { customElement } from '@helix-io/core'
import { HelixBaseEmptyState } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './empty-state-root.css.js'

/**
 * @summary Says that a region has nothing in it, and what to do about it.
 *
 * @description
 * Centered and given room, because an empty state is the only thing on screen
 * and crowding it against the top edge makes the region look broken rather than
 * empty.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://helix.fusion.dev/components/empty-state
 *
 * @cssproperty --empty-state-inset - Space around the whole block.
 */
@customElement('helix-empty-state')
export class HelixEmptyState extends HelixBaseEmptyState {
  /** Whether the state sits on a surface of its own. */
  @property({ reflect: true })
  appearance?: 'outlined'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-empty-state': HelixEmptyState
  }
}
