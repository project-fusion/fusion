import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCombobox } from '@fusion.dev/helix-headless/combobox'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has no
   `<helix-listbox>` in it to remind anyone. */
import '../../listbox/index.js'
import '../../tag/root/index.js'
import { styles } from './combobox-root.generated.css.js'

/**
 * @summary A text field that filters a list of options as you type.
 *
 * @description
 * The frame is drawn around the field, so the caret, the marks, and the focus
 * ring sit inside one outline around the whole control. Input, Color Input, and
 * Date Input use the same arrangement.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Autocomplete, Typeahead, Search select
 * @use One value from a long list, found by typing.
 * @instead select - A short list you scan.
 * @instead filter-input - Several values that narrow a list.
 * @anatomy label
 * @anatomy field
 * @anatomy hint?
 * @anatomy surface
 * @practice Import Option beside Combobox. - An option belongs to the Option family, which Combobox does not register.
 * @practice Add the option yourself when `creatable` sends its create event. - The options are your light DOM, and your framework would render over an option the combobox inserted.
 * @documentation https://fusion.dev/helix/components/combobox
 *
 * @cssproperty --combobox-background-color - Fill behind the field.
 * @cssproperty --combobox-border-color - Color of the panel's edge.
 * @cssproperty --combobox-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, a hairline, so the panel has an edge as well as its shadow over a dark page. Set it to `0` for the shadow alone.
 * @cssproperty --combobox-control-size - Smallest the text field shrinks to once tags share its line.
 * @cssproperty --combobox-move-duration - How long a tag takes to fade in, to fade as it leaves, or to slide to its new place. Defaults to `--helix-duration-normal`. `0ms` moves nothing.
 * @cssproperty --combobox-move-easing - The curve a tag fades and slides along. Defaults to `--helix-easing-standard`.
 * @cssproperty --combobox-panel-size - Width of the panel. Follows the field by default.
 * @cssproperty --combobox-shadow - Shadow under the panel. Follows `--helix-shadow-floating`.
 *   A floating panel can sit over any content, so it has a shadow by default.
 */
@customElement('helix-combobox')
export class HelixCombobox extends HelixHeadlessCombobox {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-combobox': HelixCombobox
  }
}
