import { customElement } from '@helix-io/core'
import { HelixBaseSelect } from '@helix-io/headless/select'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './select-root.css.js'
/* Side-effect imports, because this renders `<helix-listbox>` in its own shadow
   root and a custom element registers on import. Without them a consumer who
   imported `@helix-io/web/select` and nothing else got a select whose panel
   never upgraded: an unknown element with unstyled options inside it, and no
   error anywhere, because an unknown element is legal HTML.
 
   The same rule the React wrappers follow, for the same reason. It surfaced
   first as a spec that passed in the suite and failed alone, which is what a
   missing registration looks like when some other file happens to supply it. */
import '../../listbox/index.js'
import '../../option/index.js'

/**
 * @summary A closed list that opens to be chosen from.
 *
 * @description
 * The trigger wears the same frame as an `Input`, because in a form it stands
 * in a row with them and a control that looks like a button among fields reads
 * as an action rather than an answer.
 *
 * The panel is an overlay surface rather than a sunken one: it sits over the
 * page instead of on it, which is what its shadow says and what tells it apart
 * from the field it came out of.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://helix.fusion.dev/components/select
 *
 * @cssproperty --select-border-color - Color of the panel's edge.
 * @cssproperty --select-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --select-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --select-surface-max-block-size - How tall the panel gets.
 */
@customElement('helix-select')
export class HelixSelect extends HelixBaseSelect {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-select': HelixSelect
  }
}
