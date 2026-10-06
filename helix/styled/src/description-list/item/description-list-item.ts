import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDescriptionListItem } from '@fusion.dev/helix-headless/description-list'
import type { CSSResultGroup } from 'lit'
import { styles } from './description-list-item.css.js'

/**
 * @summary One label and its value.
 *
 * @description
 * Each item is a subgrid of the list, so the label and value stay one element,
 * and one pair to a screen reader, while lining up with every other pair.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @cssproperty --description-list-actions-gap - The space between the value and the controls in `actions`.
 * @cssproperty --description-list-item-gap - The space between a label and its value when the label sits over it.
 * @cssproperty --description-list-label-color - The color of a label.
 * @cssproperty --description-list-label-font-size - The size of a label's text.
 * @cssproperty --description-list-label-weight - The weight of a label's text.
 * @cssproperty --description-list-value-color - The color of a value.
 */
@customElement('helix-description-list-item')
export class HelixDescriptionListItem extends HelixHeadlessDescriptionListItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-description-list-item': HelixDescriptionListItem
  }
}
