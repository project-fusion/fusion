import { customElement } from '@helix-io/core'
import { HelixBaseCheckbox } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
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
 */
@customElement('helix-checkbox')
export class HelixCheckbox extends HelixBaseCheckbox {
  static override styles: CSSResultGroup = [fieldStyles, fieldInlineStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-checkbox': HelixCheckbox
  }
}
