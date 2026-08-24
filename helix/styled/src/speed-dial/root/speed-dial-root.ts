import { customElement } from '@helix-io/core'
import { HelixHeadlessSpeedDial } from '@helix-io/headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
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
export class HelixSpeedDial extends HelixHeadlessSpeedDial {
  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial': HelixSpeedDial
  }
}
