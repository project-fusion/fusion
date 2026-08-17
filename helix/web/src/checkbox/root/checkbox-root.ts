import { customElement } from '@helix-io/core'
import { HelixBaseCheckbox } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldInlineStyles } from '../../field/field-inline.css.js'
import { styles } from './checkbox-root.css.js'

/**
 * @summary A box that is ticked, or not, or neither.
 *
 * @description
 * The box is the native input, restyled rather than replaced, so the tick and
 * the indeterminate dash are the browser's own and the control stays a control
 * for anything reading the page.
 *
 * The label sits beside it and the whole thing is the click target, which is
 * what a native `<label>` wrapping a checkbox gives and what a reader expects.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Tickbox, Toggle
 * @documentation https://helix.fusion.dev/components/checkbox
 *
 * @cssproperty --checkbox-size - Width and height of the box.
 * @cssproperty --checkbox-checked-color - Fill of a ticked box.
 * @cssproperty --checkbox-background-color - Fill of an unticked box.
 * @cssproperty --checkbox-mark-color - Ink the tick is drawn in.
 * @cssproperty --checkbox-card-padding - Inset of the card appearance.
 */
@customElement('helix-checkbox')
export class HelixCheckbox extends HelixBaseCheckbox {
  static override styles: CSSResultGroup = [fieldStyles, fieldInlineStyles, styles]

  /**
   * How the choice presents itself.
   *
   * - `plain` is the default and is never written: a box beside its words,
   *   which is what a list of choices should be almost always.
   * - `card` puts it in a bounded surface, for options that need room to
   *   explain themselves: a description, an icon, a price. It is the half a
   *   `data-card` link cannot do, because a link reports no value and belongs
   *   to no group, so a card that is genuinely an answer has to be this.
   *
   * The box stays in both. A card whose only marker was its own border would
   * ask a reader to compare surfaces across a row to find the answer, and would
   * leave nothing for a high-contrast display.
   */
  @property({ reflect: true })
  appearance?: 'plain' | 'card'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-checkbox': HelixCheckbox
  }
}
