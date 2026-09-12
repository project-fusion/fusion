import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDescriptionList } from '@fusion.dev/helix-headless/description-list'
import type { CSSResultGroup } from 'lit'
import { styles } from './description-list-root.css.js'

/**
 * @summary Labels and their values, read as pairs: the details panel every
 * product has.
 *
 * @description
 * Each label is quiet and each value takes the text around it, so the eye goes
 * to the values and the labels are there to find them by. With
 * `direction="row"` the labels share one column, as wide as the longest of
 * them, and the values start on one line beside it.
 *
 * **Beside falls back to over below about 22rem of its own width**, measured on
 * the list rather than on the viewport, since a details panel is as often a
 * sidebar on a wide screen as the whole of a narrow one. Below that the label
 * column leaves the values too little room to be read.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @aliases Data list, Key-value list, Details, Properties
 * @documentation https://helix.fusion.dev/components/description-list
 *
 * @cssproperty --description-list-gap - Space between one pair and the next.
 */
@customElement('helix-description-list')
export class HelixDescriptionList extends HelixHeadlessDescriptionList {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-description-list': HelixDescriptionList
  }
}
