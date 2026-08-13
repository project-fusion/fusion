import { customElement } from '@helix-io/core'
import { HelixBaseButton } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './button-root.css.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Four appearances and three sizes, all drawn on one control so a link styled
 * as a button and a real button are indistinguishable to a reader. The focus
 * ring is declared here rather than inherited, because the base layer's
 * `:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot start - Content before the label, usually an icon.
 * @slot end - Content after the label.
 *
 * @csspart button - The inner button or anchor.
 *
 * @cssproperty --button-background-color - Fill behind the button.
 * @cssproperty --button-foreground-color - Label and icon color.
 * @cssproperty --button-radii - Corner radius of the control.
 */
@customElement('helix-button')
export class HelixButton extends HelixBaseButton {
  /** How much visual weight the button carries. */
  @property({ reflect: true })
  appearance: 'primary' | 'neutral' | 'subtle' | 'danger' = 'neutral'

  /** Height and inset of the control. */
  @property({ reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button': HelixButton
  }
}
