import { customElement } from '@helix-io/core'
import { HelixBaseIconButton } from '@helix-io/headless'
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
 * @category actions
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
export class HelixIconButton extends HelixBaseIconButton {
  /**
   * How much of its colour the button wears. See `Button` for the full note.
   *
   * `ghost` is the resting state here rather than `outlined`, and is never
   * written: a toolbar of framed squares is a toolbar of boxes.
   */
  @property({ reflect: true })
  appearance?: 'ghost' | 'outlined' | 'solid' | 'subtle'

  /** What the button means, which decides its colour and nothing else. */
  @property({ reflect: true })
  tone?: 'danger' | 'neutral' | 'primary'

  /**
   * One word for the four pairings. See `Button` for the full note.
   *
   * The mapping differs by one, because this control rests as a ghost:
   * `tertiary` is the resting state here, and `danger` is a red mark on it
   * rather than a filled red square.
   */
  @property({ reflect: true })
  variant?: 'danger' | 'primary' | 'secondary' | 'tertiary'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon-button': HelixIconButton
  }
}
