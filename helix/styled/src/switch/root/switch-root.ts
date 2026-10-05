import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSwitch } from '@fusion.dev/helix-headless/switch'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
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
 * The thumb is an element, the `thumb` part, and holds an icon for each state:
 * one in the `on` slot shows while the switch is on, and one in the `off` slot
 * while it is off.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Toggle switch, On/off
 * @documentation https://fusion.dev/helix/components/switch
 *
 * @slot - The label that names what the switch turns on.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot off - An icon on the thumb while the switch is off.
 * @slot on - An icon on the thumb while the switch is on.
 *
 * @csspart control - The input.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The row: the track and its label.
 * @csspart hint - Help under the control, while nothing is wrong.
 * @csspart label - The label beside the track.
 * @csspart thumb - The thumb that travels along the track, and the icon on it.
 * @csspart track - The track.
 *
 * @cssproperty --switch-block-size - Height of the track. The width follows it.
 * @cssproperty --switch-icon-color - Color of the icon on the thumb. Without it, the icon is muted while off and takes the on color while on.
 * @cssproperty --switch-inline-size - Length of the track. Set it to override the length derived from the height.
 * @cssproperty --switch-on-color - Fill when the switch is on.
 * @cssproperty --switch-thumb-color - Color of the thumb, in both states.
 */
@customElement('helix-switch')
export class HelixSwitch extends HelixHeadlessSwitch {
  static override styles: CSSResultGroup = [fieldStyles, fieldInlineStyles, styles]

  /**
   * The thumb as an element, so it is a part and holds an icon for each state.
   * The slot for the other state is `hidden`, which takes its icon out.
   */
  protected override renderThumb(): TemplateResult {
    return html`<span part="thumb" aria-hidden="true"
      ><slot name="on" ?hidden=${!this.checked}></slot
      ><slot name="off" ?hidden=${this.checked}></slot
    ></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-switch': HelixSwitch
  }
}
