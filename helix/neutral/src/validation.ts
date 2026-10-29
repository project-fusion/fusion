/**
 * How a form control says what its verdict reads in its headless source.
 * Read as syntax, as `tree.ts` says.
 */

/**
 * What a form control's verdict reads. Its answer is what its `toggle`, its
 * `collection`, or its `entry` holds: a checkbox's is missing while it is not
 * checked, a radio group's while nothing is chosen, and an input's while it
 * holds no text. A missing answer shows once the reader has had a go at the
 * control, and the page's message at once.
 *
 * **An entry's text is held to the props named here too**: its length, the
 * pattern it matches, and what its type says it is. The web asks its
 * `<input>`, and a phone works each out in JavaScript with Helix's own
 * sentences.
 *
 * **A number a reader types and steps is held to its `range`**: text that
 * reads as no number, a number past either end, and one off its step, each
 * with the sentence its prop holds.
 */
export interface Validation {
  /** The prop that holds the sentence for text that reads as no number. */
  readonly badInput?: string
  /**
   * The prop that holds the page's own message, which shows at once.
   */
  readonly feedback?: string
  /**
   * The prop that holds the most characters an entry's text may have.
   */
  readonly maxLength?: string
  /**
   * The name of the value the element computes as the sentence it shows
   * under the control: the page's message, or the verdict's once the reader
   * has had a go. A render reads it as `validation.message`.
   */
  readonly message?: string
  /**
   * The prop that holds the fewest characters an entry's text may have.
   */
  readonly minLength?: string
  /**
   * The prop that holds a regular expression an entry's text matches whole.
   */
  readonly pattern?: string
  /** The prop that holds the sentence for a number above its largest, with `{max}` in its place. */
  readonly rangeOverflow?: string
  /** The prop that holds the sentence for a number below its smallest, with `{min}` in its place. */
  readonly rangeUnderflow?: string
  /**
   * The prop that holds the sentence for a number off its step, with
   * `{below}` and `{above}` in place of the nearest numbers on it.
   */
  readonly stepMismatch?: string
  /**
   * The prop that holds the sentence for text shorter than `minLength`,
   * where the length counts however the text came, as a Pin Input's code.
   * `{length}` in it is how many characters fill the text.
   */
  readonly tooShort?: string
  /**
   * The prop that holds what an entry's text is, as `email` or `url`, which
   * the text has to read as.
   */
  readonly type?: string
  /**
   * The prop that holds the sentence for a missing answer. Its default is the
   * control's own sentence.
   */
  readonly valueMissing?: string
  /**
   * The prop that makes an answer required.
   */
  readonly required: string
}
