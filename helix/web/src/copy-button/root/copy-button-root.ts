import { customElement } from '@helix-io/core'
import { HelixBaseCopyButton } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { HelixIconButton } from '../../icon-button/root/icon-button-root.js'
import { MixinControlSurface } from '../../mixins/mixin-control-surface/mixin-control-surface.js'
import { styles } from './copy-button-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A button that puts a string on the clipboard and says it did.
 *
 * @description
 * Takes the icon button's square box, then stacks its two faces in one grid
 * cell so the press never changes the button's size. See the stylesheet: a
 * control that resizes under the pointer at the moment a reader is looking at
 * it for reassurance reads as a second, accidental press.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @documentation https://helix.fusion.dev/components/copy-button
 */
@customElement('helix-copy-button')
export class HelixCopyButton extends MixinControlSurface(HelixBaseCopyButton) {
  static override styles: CSSResultGroup = [HelixIconButton.styles, styles].flat()
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-copy-button': HelixCopyButton
  }
}
