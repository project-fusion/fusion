import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOption } from '@fusion.dev/helix-headless/option'
import type { CSSResultGroup } from 'lit'
import { styles } from './option-root.css.js'

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
 * @cssproperty --option-active-color - The background of the option the keyboard is on.
 * @cssproperty --option-block-padding - The space above and below the option. `Command` increases it for its longer list of rows.
 * @cssproperty --option-padding - The space before the label, shared with a group heading.
 * @cssproperty --option-radius - The corner radius of the row. A listbox and a select remove it.
 */
@customElement('helix-option')
export class HelixOption extends HelixHeadlessOption {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-option': HelixOption
  }
}
