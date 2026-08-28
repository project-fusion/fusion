import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToggle } from '@fusion.dev/helix-headless/toggle'
import type { CSSResultGroup } from 'lit'
import { styles } from './toggle-root.css.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Carries no background of its own. The selected look comes from the group's
 * indicator sitting behind it, which is what lets that marker travel instead of
 * one fill appearing as another disappears.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases Segment, NavItem, Option
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The item's label.
 *
 * @csspart item - The button or anchor.
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
