import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToggle } from '@fusion.dev/helix-headless/toggle'
import type { CSSResultGroup } from 'lit'
import { styles } from './toggle-root.css.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Has no background of its own. The selected look comes from the group's
 * indicator behind it, which moves between items.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segment, NavItem, Option
 * @documentation https://fusion.dev/helix/components/toggle
 *
 * @slot - The item's label.
 *
 * @csspart item - The radio button.
 */
@customElement('helix-toggle')
export class HelixToggle extends HelixHeadlessToggle {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toggle': HelixToggle
  }
}
