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
 * @cssproperty --icon-button-shadow - What it casts, where it is raised off the page.
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
   * The outline it is cut to, which is a third axis and not a fourth appearance.
   *
   * `appearance` says how filled it is and `tone` says what it means; neither of
   * them says what shape it is, and folding a shape into either would put a
   * control's outline in the same word as its colour. A rounded square is the
   * resting one because that is what a control in a row of controls should be.
   *
   * `circle` is the floating action button, and it is the reason this exists: a
   * round, raised, primary control holding the one action a screen is for. It is
   * a shape rather than a component, because a component would re-declare
   * `appearance`, `tone`, `label` and the size around a control that already has
   * them, and because the same shape is wanted by an avatar's overlay, a media
   * control and a map's own buttons. Where it sits is the page's business: see
   * `data-dock` in the base layer.
   */
  @property({ reflect: true })
  shape?: 'circle'

  /**
   * Whether it is raised off the page it sits on.
   *
   * Separate from `shape`, because they are separate facts: a docked control is
   * raised whatever its outline, and a circle inside a toolbar is not raised at
   * all. Shadow rather than a border, since what is under a floating control is
   * the page and a line drawn on the page is not the same as being above it.
   */
  @property({ reflect: true, type: Boolean })
  raised = false

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
