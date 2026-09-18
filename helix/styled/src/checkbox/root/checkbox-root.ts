import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCheckbox } from '@fusion.dev/helix-headless/checkbox'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldInlineStyles } from '../../shared/field/field-inline.css.js'
import { styles } from './checkbox-root.css.js'

/**
 * @summary A box that is ticked, or not, or neither.
 *
 * @description
 * The box is the native input with its own drawing switched off, so the control
 * stays a control for anything reading the page while the tick and the
 * indeterminate dash are drawn here, as masks over a mark beside it, and their
 * weight, color and motion are the design system's rather than the browser's.
 *
 * The label sits beside it and the whole thing is the click target, which is
 * what a native `<label>` wrapping a checkbox gives and what a reader expects.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Tickbox
 * @documentation https://fusion.dev/helix/components/checkbox
 *
 * @cssproperty --checkbox-background-color - Fill of the box, which does not change when it is ticked.
 * @cssproperty --checkbox-border-color - Edge of the box, in every state.
 * @cssproperty --checkbox-card-background-color - Fill behind a card-shaped choice.
 * @cssproperty --checkbox-card-border-color - Edge around one.
 * @cssproperty --checkbox-card-padding - Inset of the card appearance.
 * @cssproperty --checkbox-checked-color - Edge of a ticked box, where `--checkbox-border-color` is unset.
 * @cssproperty --checkbox-mark-color - Ink the tick is drawn in.
 * @cssproperty --checkbox-size - Width and height of the box.
 */
@customElement('helix-checkbox')
export class HelixCheckbox extends HelixHeadlessCheckbox {
  static override styles: CSSResultGroup = [fieldStyles, fieldInlineStyles, styles]

  /**
   * Where the choice's own surface ends.
   *
   * The question `separation` asks everywhere else, asked of one option, so it
   * is that word: what these values pick is a surface, and `plain` is already
   * the registry's own word for the answer this family used it for. `Radio`
   * takes the same three for the same reason.
   *
   * - `plain` is the resting one and is never written: a box beside its words,
   *   which is what a list of choices should be almost always.
   * - `outlined` puts it in a bounded surface, for options that need room to
   *   explain themselves: a description, an icon, a price. It is the half a
   *   `data-card` link cannot do, because a link reports no value and belongs
   *   to no group, so a card that is genuinely an answer has to be this.
   * - `filled` is that same card on a ground of its own with no edge, which is
   *   what a column of options wants where a hairline around every one of them
   *   is a grid of lines rather than a set of answers.
   *
   * **`elevated` is the one value of the axis this family does not take.** A
   * raised choice competes with a dialog: the top layer is where a thing that
   * interrupts you lives, and an option in a form is not one of those.
   *
   * The box stays in all of them. A card whose only marker was its own border
   * would ask a reader to compare surfaces across a row to find the answer, and
   * would leave nothing for a high-contrast display.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-checkbox': HelixCheckbox
  }
}
