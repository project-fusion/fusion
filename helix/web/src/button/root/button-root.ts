import { customElement } from '@helix-io/core'
import { HelixBaseButton } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * @status experimental
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot start - Content before the label, usually an icon.
 * @slot end - Content after the label.
 *
 * @csspart button - The inner control.
 *
 * @cssproperty --button-background-color - Fill behind the button.
 * @cssproperty --button-foreground-color - Label and icon color.
 * @cssproperty --button-inline-size - Width taken by `fill="standard"`.
 * @cssproperty --button-radii - Corner radius of the control.
 * @cssproperty --button-radii-start - Leading corners, which a group flattens.
 * @cssproperty --button-radii-end - Trailing corners, which a group flattens.
 */
@customElement('helix-button')
export class HelixButton extends HelixBaseButton {
  /**
   * How much visual weight the button carries.
   *
   * - `primary` is the one action a region is for, and there should be one. Two
   *   primary buttons are two things claiming to be the most important, and the
   *   reader has to work out which of you meant it.
   * - `secondary` is an action that is real but not the point, which is most
   *   buttons on most pages. A page whose every button is primary has said
   *   nothing about which one matters.
   * - `tertiary` is quiet enough to sit in a row of them without the row
   *   becoming loud: for actions that are available rather than suggested.
   *   Cancel, dismiss, the contents of a toolbar.
   * - `danger` says the action is destructive before the confirmation does. The
   *   shape of the control is what a reader recognises at a glance, where a red
   *   word inside a neutral button is something they have to read first.
   *
   * This is also where emphasis comes from, rather than size: a filled primary
   * button says "this one matters" far louder than eight more pixels would.
   */
  @property({ reflect: true })
  appearance?: 'primary' | 'secondary' | 'tertiary' | 'danger'

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
   * Width and not weight. `appearance` says how much a button matters and this
   * says how much room it takes, and the two are independent: a `tertiary
   * standard` Cancel beside a `primary standard` Save is exactly the pairing
   * a dialog wants.
   *
   * **A consumer's own anchor takes it as `data-button-fill`**, the way it
   * takes the appearance as `data-button`:
   *
   * ```html
   * <a data-button="primary" data-button-fill="standard" href="/save">Save</a>
   * ```
   *
   * Both are one declaration in the base layer. They were not, and that was a
   * real gap rather than a missing convenience: this class promises a link
   * styled as a button and a real button are indistinguishable, and a dialog's
   * button row is built on `standard`, so the one place the promise mattered
   * most was the one place it did not hold.
   */
  @property({ reflect: true })
  fill?: 'auto' | 'full' | 'standard'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button': HelixButton
  }
}
