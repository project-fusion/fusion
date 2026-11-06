import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessIconButton } from '@fusion.dev/helix-headless/icon-button'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { MixinControlSurface } from '../../shared/mixin-control-surface/mixin-control-surface.js'
import { styles } from './icon-button-root.generated.css.js'

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
 * Set `raised` for a button that floats over the page, such as one over a map
 * or a board, and `material` for the ground under it there. A raised button
 * takes the theme's floating edge and shadow, as a popover does.
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
 * @csspart spinner - The ring a pending button turns over its icon, sized and colored by the `--icon-button-spinner-*` hooks.
 *
 * @cssproperty --icon-button-backdrop - The filter behind a button with `material`, which a translucent ground needs to be read.
 * @cssproperty --icon-button-background-color - Fill behind the button, in every state.
 * @cssproperty --icon-button-background-color-active - Fill behind the button while it is pressed. Without it, a press shows the fill of the state under it.
 * @cssproperty --icon-button-background-color-hover - Fill behind the button under the pointer. Without it, `--icon-button-background-color` also applies on hover.
 * @cssproperty --icon-button-border-color - Edge color of the control, where its emphasis or `raised` draws an edge.
 * @cssproperty --icon-button-border-width - Edge width of the control, one to four widths as `border-width` takes them. The theme's floating edge on a raised button, `--helix-border-floating`.
 * @cssproperty --icon-button-foreground-color - Icon color.
 * @cssproperty --icon-button-foreground-color-active - Icon color while the button is pressed. Without it, a press shows the color of the state under it.
 * @cssproperty --icon-button-radius - Corner radius of the control, which a group flattens through `--button-radius-start` and `--button-radius-end`, or a corner at a time through `--button-radius-start-start`, `--button-radius-start-end`, `--button-radius-end-start` and `--button-radius-end-end`, as Button reads them.
 * @cssproperty --icon-button-shadow - Shadow of a raised icon button. The theme's floating shadow, `--helix-shadow-floating`.
 * @cssproperty --icon-button-size - Edge length of the control.
 * @cssproperty --icon-button-spinner-color - Color of the ring a pending button turns. It follows the icon's color.
 * @cssproperty --icon-button-spinner-duration - How long the ring takes to turn once.
 * @cssproperty --icon-button-spinner-size - Size of the ring a pending button turns.
 *
 * @cssstate pending - The button is pending: `pending` is set. A ring turns over its hidden icon.
 * @cssstate pressed - A Button Group in a selection mode has this button pressed.
 */
@customElement('helix-icon-button')
export class HelixIconButton extends MixinControlSurface(HelixHeadlessIconButton) {
  /**
   * The ground under the button, for one that lies over a busy surface such as
   * a map or a board. `glass` lets the surface through under a blur, `frosted`
   * turns the pair up for a surface too busy for glass, and `transparent` draws
   * no ground at all. Unset, the ground is the emphasis's own.
   *
   * A solid button keeps its fill, which is what it means: the material is the
   * ground of the other emphases.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * Floats the button over the page, with the theme's floating edge and shadow,
   * as a popover floats. A ghost button that floats is drawn on the overlay a
   * floating panel uses, so its glyph has a ground under it.
   *
   * Separate from `shape`, because they are separate facts: a docked control is
   * raised whatever its outline, and a circle inside a toolbar is not raised at
   * all. The theme says whether what floats is told apart by a shadow, a line,
   * or both, and a raised button follows it as every floating panel does.
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
