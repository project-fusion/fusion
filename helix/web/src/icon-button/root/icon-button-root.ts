import { customElement } from '@helix-io/core'
import { HelixBaseButton } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './icon-button-root.css.js'

/**
 * @summary A square button whose content is an icon.
 *
 * @description
 * Top-level rather than `Button.Icon`, because a namespace means composition:
 * `Card.Header` is part of a card, and an icon-only button is not part of a
 * button. It is a button with different content and a different shape, which
 * makes it its own component.
 *
 * `label` is not optional in practice. An icon-only control with no accessible
 * name is announced as "button" and nothing else, which is the single most
 * common way a toolbar becomes unusable without sight.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Icon button, Square button
 * @documentation https://helix.fusion.dev/components/icon-button
 *
 * @slot - The icon.
 *
 * @csspart button - The inner button or anchor.
 *
 * @cssproperty --icon-button-size - Edge length of the control.
 */
@customElement('helix-icon-button')
export class HelixIconButton extends HelixBaseButton {
  /** How much visual weight the button carries. */
  @property({ reflect: true })
  appearance?: 'primary' | 'neutral' | 'subtle' | 'danger'

  /** Edge length of the control. */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon-button': HelixIconButton
  }
}
