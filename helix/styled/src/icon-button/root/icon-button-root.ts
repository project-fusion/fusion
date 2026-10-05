import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessIconButton } from '@fusion.dev/helix-headless/icon-button'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { MixinControlSurface } from '../../shared/mixin-control-surface/mixin-control-surface.js'
import { styles } from './icon-button-root.css.js'

/**
 * @summary A square button whose content is an icon.
 *
 * @description
 * Icon Button is a top-level component. A namespace such as `Tabs.Tab` is for a
 * part of a larger component, and an icon-only button is a complete button with
 * different content and a different shape.
 *
 * Always set `label`. An icon-only control with no accessible name is announced
 * as "button" and nothing else, which is the most common way a toolbar becomes
 * unusable without sight.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Icon button, Square button
 * @documentation https://fusion.dev/helix/components/icon-button
 *
 * @slot - The icon.
 *
 * @csspart button - The inner button.
 * @csspart live - The live region that says `pending-label` when the button becomes pending under focus. It is clipped out of view and still read.
 *
 * @cssproperty --icon-button-background-color - Fill behind the button, in every state.
 * @cssproperty --icon-button-background-color-active - Fill behind the button while it is pressed. Without it, a press shows the fill of the state under it.
 * @cssproperty --icon-button-background-color-hover - Fill behind the button under the pointer. Without it, `--icon-button-background-color` also applies on hover.
 * @cssproperty --icon-button-foreground-color - Icon color.
 * @cssproperty --icon-button-foreground-color-active - Icon color while the button is pressed. Without it, a press shows the color of the state under it.
 * @cssproperty --icon-button-radius - Corner radius of the control, which a group flattens through `--button-radius-start` and `--button-radius-end`.
 * @cssproperty --icon-button-shadow - Shadow of a raised icon button.
 * @cssproperty --icon-button-size - Edge length of the control.
 * @cssproperty --icon-button-spinner-size - Size of the ring a pending button turns.
 *
 * @cssstate pending - The button is pending: `pending` is set. A ring turns over its hidden icon.
 */
@customElement('helix-icon-button')
export class HelixIconButton extends MixinControlSurface(HelixHeadlessIconButton) {
  /**
   * Raises the button off the page with a shadow.
   *
   * Separate from `shape`, because they are separate facts: a docked control is
   * raised whatever its outline, and a circle inside a toolbar is not raised at
   * all. Shadow rather than a border, since what is under a floating control is
   * the page and a line drawn on the page is not the same as being above it.
   */
  @property({ reflect: true, type: Boolean })
  raised = false

  /**
   * The button's shape. Leave it unset for a rounded square, or set `circle`.
   *
   * `emphasis` says how filled it is and `tone` says what it means; neither of
   * them says what shape it is, and folding a shape into either would put a
   * control's outline in the same word as its color. A rounded square is the
   * resting one because that is what a control in a row of controls should be.
   *
   * `circle` is the floating action button, and it is the reason this exists: a
   * round, raised, primary control holding the one action a screen is for. It is
   * a shape rather than a component, because a component would re-declare
   * `emphasis`, `tone`, `label` and the size around a control that already has
   * them, and because the same shape is wanted by an avatar's overlay, a media
   * control and a map's own buttons. Where it sits is the page's business: see
   * `data-dock` in the base layer.
   */
  @property({ reflect: true })
  shape?: 'circle'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon-button': HelixIconButton
  }
}
