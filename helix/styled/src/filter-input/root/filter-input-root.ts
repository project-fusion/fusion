import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterInput } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
/* The clear button renders one, and a custom element registers on import: a
   consumer importing this family alone would otherwise get an inert unknown
   element where the mark should be. */
import '../../icon/index.js'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './filter-input-root.css.js'

/**
 * @summary A field that narrows something else, beside what is already narrowing it.
 *
 * @description
 * The frame is the field rather than the input, so the tokens sit inside the
 * same box as the text and the focus ring is drawn once around the whole
 * control. It grows down a line at a time as tokens are added, which is the
 * arrangement Combobox takes when it is holding a selection.
 *
 * **The tokens are the consumer's own elements**, so the only thing said about
 * them here is to keep their size and not run past the field. A `Tag` slotted
 * into `tags` already looks like one; anything else looks like whatever it is.
 *
 * Height comes from the region, like every other control: `data-density` on
 * whatever holds it, not a `size` here.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases SearchField, FacetInput, TokenInput
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @cssproperty --filter-input-background-color - Fill behind the field.
 * @cssproperty --filter-input-control-size - Smallest the text keeps as tokens fill the line, before it wraps to its own.
 * @cssproperty --filter-input-size - Height of the field with nothing in it, which it grows from.
 */
@customElement('helix-filter-input')
export class HelixFilterInput extends HelixHeadlessFilterInput {
  static override styles: CSSResultGroup = [glyphStyles, fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-input': HelixFilterInput
  }
}
