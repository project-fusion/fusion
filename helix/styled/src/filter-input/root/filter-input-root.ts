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
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
import { styles } from './filter-input-root.css.js'

/**
 * @summary A text field for filters, with the active filters shown in it as tokens.
 *
 * @description
 * The frame is drawn around the field, so the tokens sit in the same box as the
 * text and one focus ring surrounds the whole control. The field grows one line
 * at a time as tokens are added, as Combobox does when it holds a selection.
 *
 * Tokens are your own elements, so the only rule for them keeps their size and
 * stops them running past the field. A `Tag` slotted into `tags` already looks
 * like a token.
 *
 * The suggestion panel is this element's own box with `role="listbox"`, and the
 * options pass their own `helix-select` through it. Combobox puts a
 * `helix-listbox` in its panel, which scrolls, because Combobox owns the
 * selection. This panel has no list inside it, so the panel itself scrolls.
 *
 * Height comes from the region, like every other control. Set `data-density` on
 * a container. The element has no `size`.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases SearchField, FacetInput, TokenInput
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @cssproperty --filter-input-action-padding-inline - The space on either side of a slotted control's label. It follows `--helix-space-xs`, the space a token uses.
 * @cssproperty --filter-input-action-size - The height of a control slotted at either end. It follows `--helix-size-tag`, so it matches the height of the tokens beside it.
 * @cssproperty --filter-input-background-color - The fill behind the field.
 * @cssproperty --filter-input-border-color - The color of the suggestion panel's border.
 * @cssproperty --filter-input-border-width - The width of the suggestion panel's border. It follows `--helix-border-floating`.
 * @cssproperty --filter-input-control-size - The smallest width the text keeps as tokens fill the line. Below it, the text wraps to its own line.
 * @cssproperty --filter-input-lead-border-color - The color of the line between the leading box and the text.
 * @cssproperty --filter-input-panel-size - The width of the suggestion panel. It matches the field by default.
 * @cssproperty --filter-input-shadow - The shadow under the panel. It follows
 *   `--helix-shadow-floating`. The panel can sit over any content, so it has a
 *   shadow by default.
 * @cssproperty --filter-input-size - The height of the empty field. The field grows from this height.
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
