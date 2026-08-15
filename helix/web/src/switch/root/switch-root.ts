import { customElement } from '@helix-io/core'
import { HelixBaseSwitch } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './switch-root.css.js'

/**
 * @summary A control that turns something on, and turns it on when pressed.
 *
 * @description
 * A thumb travelling in a groove, which is the one place in the library colour
 * is used to say "on". A checkbox does not, because a tick is legible on its
 * own; a switch has no mark, so the fill is the whole of what distinguishes the
 * two states and there is nothing else for it to be.
 *
 * The input itself is the hit target and is drawn as the track, stretched over
 * it and invisible, so the press, the focus and the label forwarding are all
 * the platform's while the picture is ours.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Toggle switch, On/off
 * @documentation https://helix.fusion.dev/components/switch
 *
 * @cssproperty --switch-width - Length of the track.
 * @cssproperty --switch-on-color - Fill when it is on.
 */
@customElement('helix-switch')
export class HelixSwitch extends HelixBaseSwitch {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-switch': HelixSwitch
  }
}
