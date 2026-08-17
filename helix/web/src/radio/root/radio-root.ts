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
 * @aliases Option, Choice
 * @documentation https://helix.fusion.dev/components/radio
 *
 * @cssproperty --radio-size - Diameter of the circle.
 * @cssproperty --radio-mark-color - Color of the dot.
 * @cssproperty --radio-background-color - Fill of an unselected circle.
 * @cssproperty --radio-card-padding - Inset of the card appearance.
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
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio': HelixRadio
  }
}
