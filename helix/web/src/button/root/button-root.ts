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
 * @category actions
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
   * How much of its colour the button wears, which is how much it matters.
   *
   * - `outlined` is the resting state and is never written: a line, a hairline
   *   wash inside it, and the label in the tone's own ink. Most buttons on most
   *   pages are this, and a page whose every button is filled has said nothing
   *   about which one matters.
   * - `solid` fills with the tone and puts the label on top of it, for the one
   *   action a region is for. There should be one.
   * - `subtle` is the tone as a wash with no line, for a button that should
   *   read as coloured without reading as the thing to press.
   * - `ghost` is the label alone until a pointer is over it: for actions that
   *   are available rather than suggested. Cancel, dismiss, a toolbar.
   *
   * This is where emphasis comes from, rather than size: a filled button says
   * "this one matters" far louder than eight more pixels would.
   *
   * **Independent of `tone`, which is the point of there being two.** Until
   * these were split, colour and fill were welded together as `primary`,
   * `secondary`, `tertiary` and `danger`: three of those are a rank and the
   * fourth is a meaning, so an outlined Delete and a Delete in a menu row could
   * not be written at all, and neither could a filled neutral. `Tag` reached
   * the same conclusion first and its note carries the longer argument.
   */
  @property({ reflect: true })
  appearance?: 'ghost' | 'outlined' | 'solid' | 'subtle'

  /**
   * What the button means, which decides its colour and nothing else.
   *
   * - `neutral` is the resting state and is never written. The button is drawn
   *   in the page's own ink.
   * - `primary` is the brand colour, for the action a region is about.
   * - `danger` says the action is destructive before the confirmation does. The
   *   colour of the control is what a reader recognizes at a glance, where a red
   *   word inside a neutral button is something they have to read first.
   *
   * Three and not six. `Tag` carries the full status set because a tag reports
   * a state, and a button performs an action: a success button and a warning
   * button are not things anybody writes, and offering them invites a page
   * where the colour of a control means nothing in particular.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'neutral' | 'primary'

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
   * says how much room it takes, and the three are independent: a `ghost
   * standard` Cancel beside a `solid primary standard` Save is exactly the
   * pairing a dialog wants.
   *
   * **A consumer's own anchor takes it as `data-button-fill`**, the way it
   * takes the appearance as `data-button`:
   *
   * ```html
   * <a data-button="solid" data-button-fill="standard" data-button-tone="primary" href="/save">Save</a>
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
