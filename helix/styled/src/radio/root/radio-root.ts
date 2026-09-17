import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessRadio } from '@fusion.dev/helix-headless/radio'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './radio-root.css.js'

/**
 * @summary One choice in a radio group.
 *
 * @description
 * A circle with a dot in it, drawn here rather than by the browser for the
 * reason the checkbox's box is: this is a `<button role="radio">`, so there was
 * never a native control to restyle, and the weight and the motion of the mark
 * are ours either way.
 *
 * The dot scales from nothing, like the checkbox's tick, so choosing shows
 * something happening. It has no color, because color is reserved for state
 * and being chosen is an answer rather than a state.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Option, Choice
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @cssproperty --radio-background-color - Fill of an unselected circle.
 * @cssproperty --radio-border-color - Edge of the circle, in every state.
 * @cssproperty --radio-card-background-color - Fill behind a card-shaped choice.
 * @cssproperty --radio-card-border-color - Edge around one.
 * @cssproperty --radio-card-padding - Inset of the card appearance.
 * @cssproperty --radio-chip-size - Diameter of the chip appearance.
 * @cssproperty --radio-mark-color - Color of the dot.
 * @cssproperty --radio-size - Diameter of the circle.
 */
@customElement('helix-radio')
export class HelixRadio extends HelixHeadlessRadio {
  static override styles: CSSResultGroup = styles

  /**
   * Takes the circle away, leaving the card as the whole control.
   *
   * Unnecessary under `chip`, which has no room for a circle beside its mark
   * and hides it already.
   *
   * `card` only, and it is a graphic that goes rather than a radio: the control
   * in the shadow root is untouched, so the row is still focusable, still
   * reported to a screen reader, and still the thing a form submits.
   *
   * Safe because the card already carries the answer in its surface, a raised
   * fill inside a primary edge and a three-pixel ring of it. Without that ring
   * nothing would be left saying which card was chosen.
   *
   * Not on `Checkbox`, deliberately. A radio card with no circle is still
   * unmistakably one-of-many because its siblings behave that way; a checkbox
   * card with no box loses the only thing that says you may pick several.
   */
  @property({ attribute: 'hide-control', reflect: true, type: Boolean })
  hideControl = false

  /**
   * How the choice presents itself.
   *
   * - `plain` is the default and is never written: a circle beside its words,
   *   which is what a list of choices should be almost always.
   * - `card` puts it in a bounded surface, for options that need room to
   *   explain themselves: a description, an icon, a price. It is the half a
   *   `data-card` link cannot do, because a link reports no value and belongs
   *   to no group, so a card that is genuinely an answer has to be this.
   * - `chip` is the answer as its own small surface, for a row of short
   *   choices read at a glance. It hides the circle, the surface being the
   *   whole mark, which is why `hide-control` says it is unnecessary here.
   *
   * The circle stays in both. A card whose only marker was its own border would
   * ask a reader to compare surfaces across a row to find the answer, and would
   * leave nothing for a high-contrast display.
   */
  @property({ reflect: true })
  variant?: 'chip' | 'plain' | 'card'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio': HelixRadio
  }
}
