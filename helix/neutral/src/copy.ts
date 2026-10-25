/**
 * How an element puts text on the clipboard as it is pressed. Read as
 * syntax, as `tree.ts` says.
 */

/** The words an element is named by as a copy stands, each a prop or a value it computes. */
export interface CopyWords {
  /** Its name once a copy is confirmed, as a copy button's `copied-label`. */
  readonly copied: string
  /** Its name once a press put nothing on the clipboard, as `error-label`. */
  readonly failed: string
  /** Its name at rest, as `label`. */
  readonly resting: string
}

/**
 * A copy to the clipboard as the pressable that `copies` is pressed, and the
 * result it holds for a moment, as a copy button confirms a copy.
 *
 * **The clipboard capability writes it**, the browser's clipboard on the web
 * and expo-clipboard on a phone, and **the timers capability ends the
 * result**, so a fake clock moves both platforms alike. Empty text is not
 * copied, and is a failed copy.
 */
export interface Copy {
  /** The prop that holds how long the result stands, in milliseconds. */
  readonly after: string
  /** The state that holds while a copy stands confirmed. The source declares it in `states`. */
  readonly copied: string
  /** The state that holds while a failed copy is said. The source declares it in `states`. */
  readonly failed: string
  /** The event sent when a press put nothing on the clipboard. */
  readonly fails: string
  /** The value the element computes: the words it is named by now. */
  readonly says: string
  /** The event sent once the text is on the clipboard, its `value` the text. */
  readonly sends: string
  /** The prop that holds the text a press copies. */
  readonly text: string
  /** The value the element computes: the result's words while it stands, and none at rest. */
  readonly told: string
  /** The words it is named by, as the copy stands. */
  readonly words: CopyWords
}

/** A copy to the clipboard as the element's pressable that `copies` is pressed. */
export const copy = (fields: Copy): Copy => fields
