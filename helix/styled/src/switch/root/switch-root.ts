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
 * A thumb traveling in a groove, which is the one place in the library color
 * is used to say "on". A checkbox does not, because a tick is legible on its
 * own; a switch has no mark, so the fill is the whole of what distinguishes the
 * two states and there is nothing else for it to be.
 *
 * The input itself is the hit target and is drawn as the track, stretched over
 * it and invisible, so the press, the focus and the label forwarding are all
 * the platform's while the picture is ours.
 *
 * **Its height is `--helix-size-switch`, which is one step above the
 * checkbox's** at every density rather than the same as it. A checkbox is a box
 * with a mark in it; a switch is a track with a thumb inside it, and at the
 * checkbox's height the thumb has two pixels of groove around it and the whole
 * control reads as a small dash. The width follows the height, so setting
 * `--switch-height` widens it too and the proportion is not something a
 * consumer has to keep.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Toggle switch, On/off
 * @documentation https://helix.fusion.dev/components/switch
 *
 * @cssproperty --switch-height - Height of the track. The width follows it.
 * @cssproperty --switch-on-color - Fill when it is on.
 * @cssproperty --switch-thumb-color - The handle, in both states.
 * @cssproperty --switch-width - Length of the track, if not the derived one.
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
