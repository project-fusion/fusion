import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOption } from '@fusion.dev/helix-headless/option'
import type { CSSResultGroup } from 'lit'
import { styles } from './option-root.css.js'

/**
 * @summary One choice in a listbox.
 *
 * @description
 * Two states that look different on purpose: chosen, which is a fact about the
 * value, and active, which is where the keyboard is. A list that draws them the
 * same way leaves a reader arrowing through it unable to tell what they have
 * picked from what they are looking at.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Item, Choice
 * @documentation https://fusion.dev/helix/components/option
 *
 * @cssproperty --option-active-color - Wash behind the option the keyboard is on.
 * @cssproperty --option-block-padding - Space above and below it. `Command` raises this, a palette being a page of rows read at speed rather than a select's short list.
 * @cssproperty --option-padding - Space before the label, shared with a group heading.
 * @cssproperty --option-radius - Corner radius of the row. A listbox and a select flatten it.
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
