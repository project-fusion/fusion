import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSwitch } from '@fusion.dev/helix-headless/switch'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldInlineStyles } from '../../shared/field/field-inline.css.js'
import { styles } from './switch-root.css.js'

/**
 * @summary A control that turns something on or off.
 *
 * @description
 * A thumb moves along a track. The switch is the one place in Helix where color
 * means "on". A checkbox has a tick, and a switch has no mark, so the fill is
 * what tells the two states apart.
 *
 * The input is the hit target. It is stretched over the track and made
 * invisible, so the press, the focus, and the label forwarding come from the
 * platform.
 *
 * The height is `--helix-size-switch`, one step above the checkbox's at every
 * density. At the checkbox's height the thumb has two pixels of track around
 * it, and the control looks like a small dash. The width follows the height, so
 * setting `--switch-block-size` widens the switch too and keeps the proportion.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Toggle switch, On/off
 * @documentation https://fusion.dev/helix/components/switch
 *
 * @cssproperty --switch-block-size - Height of the track. The width follows it.
 * @cssproperty --switch-inline-size - Length of the track. Set it to override the length derived from the height.
 * @cssproperty --switch-on-color - Fill when the switch is on.
 * @cssproperty --switch-thumb-color - Color of the thumb, in both states.
 */
@customElement('helix-switch')
export class HelixSwitch extends HelixHeadlessSwitch {
  static override styles: CSSResultGroup = [fieldStyles, fieldInlineStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-switch': HelixSwitch
  }
}
