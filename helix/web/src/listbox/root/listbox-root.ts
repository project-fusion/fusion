import { customElement } from '@helix-io/core'
import { HelixBaseListbox } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './listbox-root.css.js'

/**
 * @summary A list of options, one or several of which are the answer.
 *
 * @description
 * A framed, scrolling list with the field's three parts around it. The frame is
 * the list rather than the host, so a filter that empties it leaves a box with
 * a message in it rather than a border collapsing to nothing.
 *
 * `--listbox-max-block-size` is what makes it scroll rather than run down the
 * page. The keyboard brings the active option into that box itself, so a long
 * list moves under the reader rather than the reader moving to find it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Options, Select list
 * @documentation https://helix.fusion.dev/components/listbox
 *
 * @cssproperty --listbox-max-block-size - How tall it gets before it scrolls.
 */
@customElement('helix-listbox')
export class HelixListbox extends HelixBaseListbox {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-listbox': HelixListbox
  }
}
