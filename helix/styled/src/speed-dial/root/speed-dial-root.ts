import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpeedDial } from '@fusion.dev/helix-headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './speed-dial-root.css.js'
import '../../icon/index.js'

/**
 * @summary A floating button that opens a short list of the main actions on a screen.
 *
 * @description
 * Presentation only: the column the actions fan into, and which end they line
 * up on. Everything about what opens it, what closes it and how a keyboard
 * moves through it is the base class.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases FAB, Floating action button, Action button, Quick actions
 * @documentation https://fusion.dev/helix/components/speed-dial
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
