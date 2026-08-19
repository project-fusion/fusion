import { customElement } from '@helix-io/core'
import { HelixBaseRadio } from '@helix-io/headless'
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
 * @status experimental
 * @category forms
 * @aliases Option, Choice
 * @documentation https://helix.fusion.dev/components/radio
 *
 * @cssproperty --radio-size - Diameter of the circle.
 * @cssproperty --radio-mark-color - Color of the dot.
 * @cssproperty --radio-background-color - Fill of an unselected circle.
 * @cssproperty --radio-card-padding - Inset of the card appearance.
 * @cssproperty --radio-card-background-color - Fill behind a card-shaped choice.
 * @cssproperty --radio-card-border-color - Edge around one.
 */
@customElement('helix-radio')
export class HelixRadio extends HelixBaseRadio {
  static override styles: CSSResultGroup = styles

  /**
   * How the choice presents itself.
   *
   * - `plain` is the default and is never written: a circle beside its words,
   *   which is what a list of choices should be almost always.
   * - `card` puts it in a bounded surface, for options that need room to
   *   explain themselves: a description, an icon, a price. It is the half a
   *   `data-card` link cannot do, because a link reports no value and belongs
   *   to no group, so a card that is genuinely an answer has to be this.
   *
   * The circle stays in both. A card whose only marker was its own border would
   * ask a reader to compare surfaces across a row to find the answer, and would
   * leave nothing for a high-contrast display.
   */
  @property({ reflect: true })
  appearance?: 'plain' | 'card'

  /**
   * Takes the circle away, leaving the card as the whole control.
   *
   * `card` only, and it is a graphic that goes rather than a radio: the control
   * in the shadow root is untouched, so the row is still focusable, still
   * reported to a screen reader, and still the thing a form submits.
   *
   * Safe because the card already carries the answer in its surface, a raised
   * fill inside a primary edge and a three-pixel ring of it. That ring is
   * recent, and before it there was nothing left saying which card was chosen,
   * which is why this is a property now and could not have been one then.
   *
   * Not on `Checkbox`, deliberately. A radio card with no circle is still
   * unmistakably one-of-many because its siblings behave that way; a checkbox
   * card with no box loses the only thing that says you may pick several.
   */
  @property({ attribute: 'hide-control', reflect: true, type: Boolean })
  hideControl = false
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio': HelixRadio
  }
}
