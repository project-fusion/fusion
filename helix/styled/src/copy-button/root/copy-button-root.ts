import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCopyButton } from '@fusion.dev/helix-headless/copy-button'
import type { CSSResultGroup } from 'lit'
import { HelixIconButton } from '../../icon-button/root/icon-button-root.js'
import { MixinControlSurface } from '../../shared/mixin-control-surface/mixin-control-surface.js'
import { styles } from './copy-button-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A button that copies a string to the clipboard and confirms the copy.
 *
 * @description
 * Uses the icon button's square box and stacks its two faces in one grid cell,
 * so a press never changes the button's size. A button that resizes as you
 * press it looks like a second, accidental press.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @documentation https://fusion.dev/helix/components/copy-button
 */
@customElement('helix-copy-button')
export class HelixCopyButton extends MixinControlSurface(HelixHeadlessCopyButton) {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [HelixIconButton.styles, styles].flat()
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-copy-button': HelixCopyButton
  }
}
