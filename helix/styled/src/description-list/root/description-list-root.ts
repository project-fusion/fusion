import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDescriptionList } from '@fusion.dev/helix-headless/description-list'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './description-list-root.css.js'

/**
 * @summary A list of labels and their values, such as a details panel.
 *
 * @description
 * Labels are muted and values use the style of the surrounding text, so the
 * values stand out and the labels help you find them. With `direction="row"`,
 * the labels share one column as wide as the longest label, and the values
 * start on one line beside it.
 *
 * **Below about 22rem of its own width, the row layout stacks** each label
 * above its value. The width is measured on the list, because a details panel
 * can be a sidebar on a wide screen or the whole of a narrow one. Below that
 * width the label column leaves too little room for the values.
 *
 * **For a summary, set `width="auto"` and `justify="between"`.** The list is as
 * wide as its widest pair, labels sit on the start edge, and values sit on the
 * end edge in tabular figures, as in a set of totals.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Data list, Key-value list, Details, Properties
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @cssproperty --description-list-column-gap - The space between the column of labels and the column of values, with `direction="row"`.
 * @cssproperty --description-list-gap - Space between one pair and the next. The default is smaller with `direction="row"` than when stacked. Setting this property replaces both defaults.
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
   * Flex's value for the same idea, under a shorter name than Flex's own:
   * there it is `justify-content`, the CSS property it sets, and here the
   * underlying layout is a grid handing an edge down to each item as a custom
   * property, so the labels still share one column while the values share an
   * end. Naming a property this does not set after it would be the wrong kind
   * of precision.
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
