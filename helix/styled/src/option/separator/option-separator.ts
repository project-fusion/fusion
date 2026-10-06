import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOptionSeparator } from '@fusion.dev/helix-headless/option'
import type { CSSResultGroup } from 'lit'
import { styles } from './option-separator.css.js'

/**
 * @summary A rule between options or groups inside a listbox.
 *
 * @description
 * A hairline across the panel in the list's border color, with a little air
 * either side.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Divider, ListBoxSeparator
 * @documentation https://fusion.dev/helix/components/option
 *
 * @cssproperty --option-separator-color - The rule's color.
 * @cssproperty --option-separator-space - The space above and below the rule.
 * @cssproperty --option-separator-thickness - The rule's thickness.
 */
@customElement('helix-option-separator')
export class HelixOptionSeparator extends HelixHeadlessOptionSeparator {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-option-separator': HelixOptionSeparator
  }
}
