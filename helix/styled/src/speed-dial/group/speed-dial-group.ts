import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpeedDialGroup } from '@fusion.dev/helix-headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { styles } from './speed-dial-group.css.js'

/**
 * @summary A named set of actions inside a speed dial, set apart from the rest.
 *
 * @description
 * A column of actions with its name above them, in the small muted words a
 * menu heads its sections with, lined up on the side the trigger is on. The
 * space between two groups is the space between two actions.
 *
 * @since 0.141.0
 * @status stable
 * @category actions
 * @aliases Speed dial section, Action group
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @cssproperty --speed-dial-group-label-color - Color of the group's name.
 * @cssproperty --speed-dial-group-label-font-size - Size of the group's name.
 */
@customElement('helix-speed-dial-group')
export class HelixSpeedDialGroup extends HelixHeadlessSpeedDialGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial-group': HelixSpeedDialGroup
  }
}
