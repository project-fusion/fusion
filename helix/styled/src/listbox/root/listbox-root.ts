import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessListbox } from '@fusion.dev/helix-headless/listbox'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './listbox-root.css.js'

/**
 * @summary A list of options, from which you choose one or several.
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
 * @status stable
 * @category forms
 * @aliases Options, Select list
 * @documentation https://fusion.dev/helix/components/listbox
 *
 * @cssproperty --listbox-background-color - The panel's fill. Set it to `transparent` when the list is already inside a panel.
 * @cssproperty --listbox-border - The panel's border, as a shorthand. Set it to `none` when the list is already inside a panel.
 * @cssproperty --listbox-max-block-size - Maximum height of the list before it scrolls.
 */
@customElement('helix-listbox')
export class HelixListbox extends HelixHeadlessListbox {
  static override styles: CSSResultGroup = [
    liveStyles,
    collectionStateStyles,
    fieldStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-listbox': HelixListbox
  }
}
