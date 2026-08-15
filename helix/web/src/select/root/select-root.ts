import { customElement } from '@helix-io/core'
import { HelixBaseSelect } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './select-root.css.js'

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
 * @aliases Dropdown, Picker
 * @documentation https://helix.fusion.dev/components/select
 *
 * @cssproperty --select-surface-max-block-size - How tall the panel gets.
 */
@customElement('helix-select')
export class HelixSelect extends HelixBaseSelect {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-select': HelixSelect
  }
}
