import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDescriptionList } from '@fusion.dev/helix-headless/description-list'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * **`width="auto"` with `justify="between"` is a summary**: the list as wide as
 * its widest pair, labels on the start edge and values on the end one in
 * figures of one width, which is how a set of totals is read.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @aliases Data list, Key-value list, Details, Properties
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @cssproperty --description-list-gap - Space between one pair and the next.
 */
@customElement('helix-description-list')
export class HelixDescriptionList extends HelixHeadlessDescriptionList {
  static override styles: CSSResultGroup = styles

  /**
   * Where the values sit, beside their labels.
   *
   * Absent, each value starts right after the label column. `between` sets it on
   * the end edge instead, with the label on the start one, and in figures of one
   * width so a column of numbers lines up by its digits. Only with
   * `direction="row"`: stacked, a label and its value share one edge already.
   *
   * Flex's word for the same thing, and a grid rather than a flex row
   * underneath, so the labels still share one column while the values share an
   * end.
   */
  @property({ reflect: true })
  justify?: 'between'

  /**
   * How wide the list is.
   *
   * Absent, it fills the row it is in. `auto` is as wide as its widest pair,
   * which is what a summary beside other content wants.
   *
   * **At `auto` the list does not stack when narrow.** The fallback measures the
   * list's own width, and a list sized by its content has no width of its own to
   * measure: containment would size it to nothing. It is capped at its container
   * instead, and a long value wraps inside its column.
   */
  @property({ reflect: true })
  width?: 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-description-list': HelixDescriptionList
  }
}
