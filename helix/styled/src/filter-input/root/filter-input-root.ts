import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterInput } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
/* The clear button renders one, and a custom element registers on import: a
   consumer importing this family alone would otherwise get an inert unknown
   element where the mark should be. */
import '../../icon/index.js'
/* The suggestions are `helix-option` elements a consumer slots in, and a custom
   element registers on import: a consumer importing this family alone would
   otherwise get inert unknown elements in the panel. */
import '../../option/index.js'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
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
 * **The suggestion panel is this element's own box, not a listbox's.** Combobox
 * puts a `helix-listbox` in its panel because the options there are a selection
 * it owns; these are the consumer's suggestions, so the panel is a plain
 * `role="listbox"` region and the options pass their own `helix-select`
 * straight through it. That is why this surface scrolls where Combobox's does
 * not: there is no list inside to do it.
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
 * @cssproperty --filter-input-action-padding-inline - Space either side of a slotted control's label. Follows `--helix-space-xs`, which is what a token uses.
 * @cssproperty --filter-input-action-size - Height of a control slotted at either end. Follows `--helix-size-tag`, so it matches the tokens beside it rather than the field around them.
 * @cssproperty --filter-input-background-color - Fill behind the field.
 * @cssproperty --filter-input-border-color - Color of the suggestion panel's edge.
 * @cssproperty --filter-input-border-width - Width of that edge. Follows `--helix-border-floating`.
 * @cssproperty --filter-input-control-size - Smallest the text keeps as tokens fill the line, before it wraps to its own.
 * @cssproperty --filter-input-lead-border-color - The seam between the leading box and the text.
 * @cssproperty --filter-input-panel-size - Width of the suggestion panel. Follows the field by default.
 * @cssproperty --filter-input-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --filter-input-size - Height of the field with nothing in it, which it grows from.
 */
@customElement('helix-filter-input')
export class HelixFilterInput extends HelixHeadlessFilterInput {
  static override styles: CSSResultGroup = [
    glyphStyles,
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    tagRowStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-input': HelixFilterInput
  }
}
