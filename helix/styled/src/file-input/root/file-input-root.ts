import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFileInput } from '@fusion.dev/helix-headless/file-input'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: the tier below renders a
   `<helix-tag>` for each file's size and kind. */
import '../../tag/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './file-input-root.css.js'

/**
 * @summary A field for choosing files from a picker or by dropping them on it.
 *
 * @description
 * The field is a box, because nothing is typed into it and the whole area is
 * the target. The dashed border marks it as a drop target before anything is
 * dragged.
 *
 * The native input is laid over the field at zero opacity, so a click anywhere
 * on the box lands on the input and opens the picker. `display: none` would
 * remove the input from the tab order and from the form.
 *
 * The focus ring is drawn on the field, because the input is invisible.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases FileUpload, FilePicker, Dropzone, InputFile
 * @documentation https://fusion.dev/helix/components/file-input
 *
 * @cssproperty --file-input-background-color - Fill behind the field.
 * @cssproperty --file-input-padding - Padding inside the field.
 */
@customElement('helix-file-input')
export class HelixFileInput extends HelixHeadlessFileInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    liveStyles,
    glyphStyles,
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-file-input': HelixFileInput
  }
}
