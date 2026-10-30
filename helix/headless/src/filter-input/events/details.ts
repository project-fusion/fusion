/*
 * What the filter-input events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/**
 * Detail carried by `helix-before-facet` and `helix-facet`.
 *
 * **Everything needed to draw the chip, so nothing has to be looked up again.**
 * A consumer hearing this renders a `FilterChip` from it and stops: the labels
 * are the reader's words and the names are their own model's, and both are here
 * because only the thing that read the declarations knows both.
 */
export interface FacetDetail {
  /**
   * How many values the comparison in force takes.
   *
   * **What tells an empty filter from no filter.** `values` empty usually means
   * the field is not being filtered any more, and a consumer drops the chip; a
   * comparison of arity `none`, `is empty` or `is set`, is a filter that has no
   * values to carry and never will. Without this the two arrive identical, and
   * the thing that read the declaration is the only thing that could say which.
   */
  arity: 'many' | 'none' | 'one'
  /** What the consumer's model calls the field. */
  field: string
  /** What a reader is shown for the field. */
  label: string
  /** What the consumer's model calls the comparison in force. */
  operator: string
  /**
   * The comparison as a reader sees it, and **empty for the field's usual one**.
   *
   * Passed straight to a chip's `operator-label`, which draws the segment only
   * where there is one. Deciding it here is the point: the thing that read the
   * field knows which of its operators is the default, and the chip never has
   * to.
   */
  operatorLabel: string
  /** What the field is compared to, as the consumer's own values. */
  values: readonly string[]
}
