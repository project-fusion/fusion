import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTagGroup } from '@fusion.dev/helix-headless/tag'
import type { CSSResultGroup } from 'lit'
import { styles } from './tag-group.css.js'

/**
 * @summary A set of tags that the arrow keys move through, and that can be removed and selected from the keyboard.
 *
 * @description
 * The tags sit in a row that wraps. A selected tag is filled with its tone, as
 * `emphasis="solid"` draws one, and the focused tag takes the focus ring round
 * its whole box.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Tag list, Chip group, Token list
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @cssproperty --tag-group-gap - The space between tags, across and between rows.
 */
@customElement('helix-tag-group')
export class HelixTagGroup extends HelixHeadlessTagGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag-group': HelixTagGroup
  }
}
