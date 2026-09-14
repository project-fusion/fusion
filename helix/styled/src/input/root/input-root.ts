import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessInput } from '@fusion.dev/helix-headless/input'
import type { CSSResultGroup } from 'lit'
/* The clear and reveal buttons render one, and a custom element registers on
   import: a consumer importing this family alone would otherwise get an inert
   unknown element where the mark should be. */
import '../../icon/index.js'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './input-root.css.js'

/**
 * @summary A single line of text a reader types into.
 *
 * @description
 * The frame is the field rather than the input, so anything slotted at either
 * end sits inside the same box as the text and the focus ring is drawn once,
 * around the whole control, instead of around a smaller box within it.
 *
 * The input itself is the native one, stripped rather than replaced, so the
 * caret, the selection, the autofill, and the keyboard a phone chooses are all
 * the platform's.
 *
 * Height comes from the region, like every other control: `data-density` on
 * whatever holds it, not a `size` here. Invalid styling waits for
 * `:user-invalid`, because a field is not wrong before anyone has filled it in.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases TextField, Field, TextInput
 * @documentation https://helix.fusion.dev/components/input
 *
 * @cssproperty --input-background-color - Fill behind the text.
 * @cssproperty --input-size - Height of the field.
 */
@customElement('helix-input')
export class HelixInput extends HelixHeadlessInput {
  static override styles: CSSResultGroup = [
    glyphStyles,
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input': HelixInput
  }
}
