import { customElement } from '@helix-io/core'
import { HelixBaseFileInput } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the tier below renders `<helix-icon>` for each
   file's remove control and a custom element registers on import. Inherited from
   the base along with the template, which is why it is restated here.
   `check:composed` enforces it. */
import '../../icon/index.js'
import '../../tag/index.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
import { styles } from './file-input-root.css.js'

/**
 * @summary A control for choosing files, by pointer or by dropping them on it.
 *
 * @description
 * The field is a box rather than a line, because nothing is typed into it: its
 * height is not a line of text, and what a reader aims at is the whole area. The
 * border is dashed for the same reason a drop target usually is, which is the
 * only affordance one has before anything is being dragged.
 *
 * The native input is kept and laid over the field at zero opacity rather than
 * hidden, so a click anywhere on the box lands on the input itself and opens the
 * picker. Hiding it with `display: none` would take it out of the tab order and
 * out of the form, and a script clicking a hidden input is the same thing with
 * more moving parts.
 *
 * The focus ring is drawn on the field, because the control it belongs to is
 * invisible.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases FileUpload, FilePicker, Dropzone, InputFile
 * @documentation https://helix.fusion.dev/components/file-input
 *
 * @cssproperty --file-input-background-color - Fill behind the field.
 * @cssproperty --file-input-inset - Padding inside the field.
 */
@customElement('helix-file-input')
export class HelixFileInput extends HelixBaseFileInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [glyphStyles, fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-file-input': HelixFileInput
  }
}
