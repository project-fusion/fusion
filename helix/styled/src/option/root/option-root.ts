import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOption } from '@fusion.dev/helix-headless/option/root'
import type { CSSResultGroup } from 'lit'
import { styles as rowStyles } from '../../shared/row/row.css.js'
import { styles } from './option-root.generated.css.js'

/**
 * @summary One choice in a listbox.
 *
 * @description
 * Selected and active look different. Selected is the value, and active is
 * where the keyboard is. If both looked the same, you could not tell what you
 * picked from where you are while moving through the list with the arrow keys.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Item, Choice
 * @documentation https://fusion.dev/helix/components/option
 *
 * @cssproperty --option-active-background-color - The background of the option the keyboard is on.
 * @cssproperty --option-block-padding - The space above and below the option. `Command` increases it for its longer list of rows.
 * @cssproperty --option-dragging-opacity - The opacity of an option a finger moves on a phone. A list sets it from `--listbox-dragging-opacity`.
 * @cssproperty --option-drop-color - The color of the line where a moved option would land on a phone. A list sets it from `--listbox-drop-indicator-color`.
 * @cssproperty --option-drop-size - The thickness of the line where a moved option would land on a phone. A list sets it from `--listbox-drop-indicator-size`.
 * @cssproperty --option-padding - The space before the label, shared with a group heading.
 * @cssproperty --option-radius - The corner radius of the row. A listbox and a select remove it.
 */
@customElement('helix-option')
export class HelixOption extends HelixHeadlessOption {
  static override styles: CSSResultGroup = [rowStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-option': HelixOption
  }
}
