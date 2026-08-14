import { customElement } from '@helix-io/core'
import { HelixBaseButtonGroup } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './button-group-root.css.js'

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * The buttons are joined into a single shape: the outer corners keep their
 * radius, the inner ones lose it, and adjacent borders collapse into one line.
 *
 * That joining is in the base layer, paired with `data-button` the way the
 * button's own box is, because the corner belongs to the control inside each
 * button's shadow root and a rule in here cannot reach it. The same rule
 * therefore serves a consumer's own anchor styled as a button.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Segmented buttons, Split button
 * @documentation https://helix.fusion.dev/components/button-group
 *
 * @slot - The buttons in the group.
 */
@customElement('helix-button-group')
export class HelixButtonGroup extends HelixBaseButtonGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button-group': HelixButtonGroup
  }
}
