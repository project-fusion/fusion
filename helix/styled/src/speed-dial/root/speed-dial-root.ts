import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpeedDial } from '@fusion.dev/helix-headless/speed-dial'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './speed-dial-root.generated.css.js'

/**
 * @summary A floating button that opens a short list of the main actions on a screen.
 *
 * @description
 * Presentation only: the column the actions fan into, and the end they align
 * to. The base class handles opening, closing, and keyboard movement.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases FAB, Floating action button, Action button, Quick actions
 * @use A few main actions of a screen behind one floating button.
 * @instead menu - Commands with submenus, or items you check.
 * @instead icon-button - One main action on a floating button, such as Compose.
 * @anatomy trigger
 * @anatomy actions
 * @anatomy item
 * @anatomy icon
 * @practice Import Icon beside Speed Dial where your trigger or your actions use one. - Speed Dial draws no icon of its own, so it does not register one.
 * @practice Set `open-on="long-press"` for a trigger with an action of its own, such as composing a message. - A press then runs the trigger's action, and holding it for half a second opens the dial.
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @cssproperty --speed-dial-background-color - Fill of the trigger the dial draws when none is slotted.
 * @cssproperty --speed-dial-color - Color of that trigger's icon.
 * @cssproperty --speed-dial-gap - Space between the actions.
 * @cssproperty --speed-dial-shadow - Shadow under that trigger at rest.
 * @cssproperty --speed-dial-size - Width and height of that trigger.
 * @cssproperty --speed-dial-stagger - The wait between one action arriving and the next.
 * @cssproperty --speed-dial-travel - How far each action moves as it arrives.
 */
@customElement('helix-speed-dial')
export class HelixSpeedDial extends HelixHeadlessSpeedDial {
  static override styles: CSSResultGroup = [glyphStyles, styles]

  /**
   * When the actions' names show. Unset, always, beside each action. `hover`
   * shows a name only while its action is under the pointer or has focus, as
   * a tooltip does, for a dial whose icons speak for themselves. The names stay
   * the actions' accessible names either way.
   */
  @property({ reflect: true })
  labels?: 'hover'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-speed-dial': HelixSpeedDial
  }
}
