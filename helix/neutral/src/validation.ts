/**
 * How a form control says what its verdict reads in its headless source.
 * Read as syntax, as `tree.ts` says.
 */

/**
 * What a form control's verdict reads. Its answer is what its `toggle` or its
 * `collection` holds: a checkbox's is missing while it is not checked, and a
 * radio group's while nothing is chosen. A missing answer shows once the
 * reader has had a go at the control, and the page's message at once.
 */
export interface Validation {
  /**
   * The prop that holds the page's own message, which shows at once.
   */
  readonly feedback?: string
  /**
   * The prop that holds the sentence for a missing answer. Its default is the
   * control's own sentence.
   */
  readonly missing?: string
  /**
   * The prop that makes an answer required.
   */
  readonly required: string
}

/** What a form control's verdict reads. */
export const validation = (fields: Validation): Validation => fields
