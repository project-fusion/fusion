import { customElement } from '@helix-io/core'
import { HelixBaseSpeedDial } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './speed-dial-root.css.js'
import '../../icon/index.js'

/**
 * @summary A button that fans out the few actions a screen is for.
 *
 * @description
 * Presentation only: the column the actions fan into, and which end they line
 * up on. Everything about what opens it, what closes it and how a keyboard
 * moves through it is the base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases FAB, Floating action button, Action button, Quick actions
 * @documentation https://helix.fusion.dev/components/speed-dial
 *
 * @cssproperty --speed-dial-gap - Space between the actions.
 */
@customElement('helix-speed-dial')
export class HelixSpeedDial extends HelixBaseSpeedDial {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial': HelixSpeedDial
  }
}
