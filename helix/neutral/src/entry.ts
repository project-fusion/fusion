/**
 * How an element a reader types into says so in its headless source, as an
 * input and a textarea do. Read as syntax, as `tree.ts` says.
 */

/**
 * What an element a reader types into holds: its text. The `<TextInput>` in
 * its render is where the text is typed, and a `<Pressable clears>` empties
 * it.
 *
 * **Each edit asks first.** `onBeforeChange` names the event sent before an
 * edit stands, with the text it would leave, and a handler that refuses it
 * puts the text back. `onInput` names the event sent once each edit stands,
 * and `onChange` the one sent once the reader is done with the text, as the
 * field loses focus holding new text or as it is cleared.
 */
export interface Entry {
  /**
   * The state the element is in while the field holds no text.
   */
  readonly blank?: string
  /**
   * The name of the value the element computes as whether its press that
   * clears is drawn: while `clearable` holds, the field holds text, and the
   * reader may change it. A render reads it as `text.clearShown`.
   */
  readonly clearShown?: string
  /**
   * The prop that offers a press that empties the field.
   */
  readonly clearable?: string
  /**
   * The prop that seeds the text where nothing sets it, as `defaultValue`.
   */
  readonly defaultProp?: string
  /**
   * The event sent before an edit stands, which a handler can cancel, with
   * the text it would leave as `value`.
   */
  readonly onBeforeChange?: string
  /**
   * The event sent once the reader is done with new text: as the field loses
   * focus, or as a press that clears empties it.
   */
  readonly onChange?: string
  /**
   * The event sent once a press that clears has emptied the field, after
   * `onInput` and `onChange`.
   */
  readonly onClear?: string
  /**
   * The event sent once each edit stands.
   */
  readonly onInput?: string
  /**
   * The prop that holds the text.
   */
  readonly prop: string
  /**
   * The prop that keeps the reader from changing the text, while they can
   * still read, select, and copy it.
   */
  readonly readonly?: string
}
