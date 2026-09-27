import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessRadio } from '@fusion.dev/helix-headless/radio'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './radio-root.css.js'

/**
 * @summary One choice in a radio group.
 *
 * @description
 * Draws a circle with a dot in it. The element is a `<button role="radio">`, so
 * there is no native control to restyle, the same as the checkbox's box.
 *
 * The dot scales up from nothing when the radio is chosen, like the checkbox's
 * tick. It has no color, because Helix reserves color for state, and a chosen
 * radio is an answer.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Option, Choice
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @cssproperty --radio-background-color - The fill of an unselected circle.
 * @cssproperty --radio-border-color - The border color of the circle, in every state.
 * @cssproperty --radio-card-background-color - The fill behind a card-shaped choice.
 * @cssproperty --radio-card-border-color - The border color of a card-shaped choice.
 * @cssproperty --radio-card-padding - The padding inside a card-shaped choice.
 * @cssproperty --radio-chip-size - The diameter of a chip.
 * @cssproperty --radio-mark-color - The color of the dot.
 * @cssproperty --radio-size - The diameter of the circle.
 */
@customElement('helix-radio')
export class HelixRadio extends HelixHeadlessRadio {
  static override styles: CSSResultGroup = styles

  /**
   * Hides the circle, so the card is the whole control.
   *
   * Unnecessary under `chip`, which has no room for a circle beside its mark
   * and hides it already.
   *
   * A separated choice only, and it is a graphic that goes rather than a radio:
   * the control in the shadow root is untouched, so the row is still focusable,
   * still reported to a screen reader, and still the thing a form submits.
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
   * How the choice's own surface is set apart from its surroundings.
   *
   * The question `separation` asks everywhere else, asked of one option, so it
   * is that word: what these values pick is a surface, and `plain` is already
   * the registry's own word for the answer this family used it for.
   *
   * - `plain` is the resting one and is never written: a circle beside its
   *   words, which is what a list of choices should be almost always.
   * - `outlined` puts it in a bounded surface, for options that need room to
   *   explain themselves: a description, an icon, a price. It is the half a
   *   `data-card` link cannot do, because a link reports no value and belongs
   *   to no group, so a card that is genuinely an answer has to be this.
   * - `filled` is that same card on a ground of its own with no edge, which is
   *   what a column of choices wants where a hairline around every one of them
   *   is a grid of lines rather than a set of answers.
   *
   * **`elevated` is the one value of the axis this family does not take.** A
   * raised choice competes with a dialog: the top layer is where a thing that
   * interrupts you lives, and an option in a form is not one of those, so a
   * column of lifted cards reads as a stack of floating things none of which is
   * settled.
   *
   * The circle stays in all of them. A card whose only marker was its own
   * border would ask a reader to compare surfaces across a row to find the
   * answer, and would leave nothing for a high-contrast display.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  /**
   * Draws the choice as a small chip, for a row of short choices.
   *
   * **Not a separation, which is why it is still `variant`.** The other values
   * pick where a surface ends around a row that keeps its circle and its words;
   * a chip has neither. It hides the circle, the surface being the whole mark,
   * which is why `hide-control` says it is unnecessary here, and it takes the
   * words out of the flow to be the accessible name. That removes the
   * distinction `separation` exists to make rather than answering it.
   */
  @property({ reflect: true })
  variant?: 'chip'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio': HelixRadio
  }
}
