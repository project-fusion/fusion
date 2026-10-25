/**
 * How an element reads one of its props as a sum. Read as syntax, as
 * `tree.ts` says.
 */

/**
 * A prop an element reads as a sum, as a meter measures the sum of its
 * segments. **The sum stands in for the prop while the element holds any of
 * the elements it sums**, so the two cannot disagree.
 */
export interface Total {
  /**
   * The value the element computes that holds while it holds any of the
   * elements it sums, which `when()`, `bind()` and a rule's `state` read, as
   * a meter is `segmented` while it holds a segment. Words or another
   * element passed in beside them do not count.
   */
  readonly holds?: string
  /** The element's prop the sum stands in for. */
  readonly into: string
  /** The family whose elements are summed, by its tag without `helix-`. */
  readonly of: string
  /**
   * The prop of each of them that is summed. A value that is not a number,
   * or is below zero, adds nothing.
   */
  readonly prop: string
}

/** A prop an element reads as a sum. */
export const total = (fields: Total): Total => fields
