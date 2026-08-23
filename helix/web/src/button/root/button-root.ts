import { customElement } from '@helix-io/core'
import { HelixBaseButton } from '@helix-io/headless/button'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { MixinControlSurface } from '../../mixins/mixin-control-surface/mixin-control-surface.js'
import { styles } from './button-root.css.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Four appearances, all drawn on one control so a link styled as a button and a
 * real button are indistinguishable to a reader. There are no sizes: a control
 * takes its height from the region it is in, through `data-density`, which is
 * the one size axis in the library and the reason a row of controls cannot come
 * out ragged. The focus
 * ring is declared here rather than inherited, because the base layer's
 * `:focus-visible` rule is a light-DOM rule and stops at the shadow boundary.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot start - Content before the label, usually an icon.
 * @slot end - Content after the label.
 *
 * @csspart button - The inner control.
 *
 * @cssproperty --button-background-color - Fill behind the button, in every state.
 * @cssproperty --button-background-color-hover - Fill behind the button under the pointer. Only needed beside the one above, which otherwise holds through hover.
 * @cssproperty --button-foreground-color - Label and icon color.
 * @cssproperty --button-inline-size - Width taken by `width="standard"`.
 * @cssproperty --button-radii - Corner radius of the control.
 * @cssproperty --button-radii-start - Leading corners, which a group flattens.
 * @cssproperty --button-radii-end - Trailing corners, which a group flattens.
 */
@customElement('helix-button')
export class HelixButton extends MixinControlSurface(HelixBaseButton) {
  /**
   * How much of the space available to it the button takes.
   *
   * - `auto` is the default and is never written: the button is as wide as its
   *   label, which is what a control in a toolbar or beside a field should be.
   * - `standard` is one width for every button that takes it, so a column or
   *   row of actions lines up instead of following the length of each word.
   * - `full` fills the container, for a single action at the foot of a form or
   *   a card, and on a phone where a control is a target before it is a label.
   *
   * **This was `fill`, and the name had to disclaim itself.** The paragraph here
   * opened "Width and not weight", which is a sentence a name should not need:
   * `emphasis` on this same element is documented as "How filled it is drawn",
   * so a button carried a property called `fill` beside a property about being
   * filled, meaning different things. `separation="filled"` and
   * `ThemeIntent.separation`'s `fill` mechanism both mean a surface's own
   * colour, and every chart in the library writes `fill` for paint, which left
   * this the only use of the word meaning geometry.
   *
   * `Dialog` had already made the same move for the same reason, its
   * `appearance` becoming `size` for saying how wide a panel is, "which its own
   * description admitted in as many words". `size` is not available here,
   * because that rule's test is whether two of them sitting together could
   * legitimately differ, and two buttons do: this is a width *policy* rather
   * than a scale, and `standard` exists precisely to stop a row being ragged.
   *
   * Width and not weight, still. `emphasis` says how much a button matters and
   * this says how much room it takes, and the three are independent: a `ghost
   * standard` Cancel beside a `solid primary standard` Save is exactly the
   * pairing a dialog wants.
   *
   * **A consumer's own anchor takes it as `data-button-width`**, the way it
   * takes the emphasis as `data-button`:
   *
   * ```html
   * <a data-button="solid" data-button-width="standard" data-button-tone="primary" href="/save">Save</a>
   * ```
   *
   * Both are one declaration in the base layer. They were not, and that was a
   * real gap rather than a missing convenience: this class promises a link
   * styled as a button and a real button are indistinguishable, and a dialog's
   * button row is built on `standard`, so the one place the promise mattered
   * most was the one place it did not hold.
   */
  @property({ reflect: true })
  width?: 'auto' | 'full' | 'standard'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button': HelixButton
  }
}
