import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCombobox } from '@fusion.dev/helix-headless/combobox'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has no
   `<helix-listbox>` in it to remind anyone. */
import '../../listbox/index.js'
import '../../tag/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
import { styles } from './combobox-root.css.js'

/**
 * @summary A field that filters a list as it is typed into.
 *
 * @description
 * The frame is the field rather than the input, so the caret, the marks and the
 * focus ring are drawn once around the whole control, which is the arrangement
 * Input, Color Input and Date Input all take.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Autocomplete, Typeahead, Search select
 * @documentation https://fusion.dev/helix/components/combobox
 *
 * @cssproperty --combobox-background-color - Fill behind the field.
 * @cssproperty --combobox-border-color - Color of the panel's edge.
 * @cssproperty --combobox-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --combobox-control-size - Smallest the text field shrinks to
 * @cssproperty --combobox-panel-size - Width of the panel. Follows the field by default.
 * @cssproperty --combobox-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 */
@customElement('helix-combobox')
export class HelixCombobox extends HelixHeadlessCombobox {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
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
    'helix-combobox': HelixCombobox
  }
}
