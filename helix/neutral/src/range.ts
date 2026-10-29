/**
 * How an element a reader moves along a track says so in its headless
 * source, as a slider does. Read as syntax, as `tree.ts` says.
 */

/**
 * What an element a reader moves along a track holds: its value, a number
 * between `min` and `max` on a `step`. The `<View role="slider">` in its
 * render is the control a reader moves it with: a drag along it, a press
 * that takes the value to the point pressed, the arrow keys, Page Up and
 * Page Down, Home and End, and a screen reader's increment and decrement.
 *
 * **Each move asks first.** `onBeforeChange` names the event sent before a
 * move stands, with the value it would leave, and a handler that refuses it
 * leaves the value where it was. `onInput` names the event sent once each
 * move stands, and `onChange` the one sent once a move is done: as a drag
 * or a press ends, and with each step a key or a screen reader takes.
 *
 * **The value is held to its bounds and its step**, as a native range holds
 * it: a written value past an end or off a step is drawn where the range
 * would draw it.
 *
 * **A range whose control is a `<TextInput role="spinbutton">` is a number
 * a reader types and steps**, as a number input's. Its `text` holds what is
 * typed, which is held to the bounds and the step as the reader leaves the
 * field, and the keys, a screen reader, and each `<Pressable steps>` step
 * it, again while a press is held.
 */
export interface ValueRange {
  /** The state the element is in while its value stands at its largest. */
  readonly atMax?: string
  /** The state the element is in while its value stands at its smallest. */
  readonly atMin?: string
  /** The state the element is in while a reader drags it. */
  readonly dragging?: string
  /** The prop that seeds the value where nothing sets it, as `defaultValue`. */
  readonly defaultProp?: string
  /**
   * The name of the value the element computes as where its fill starts
   * along the track, 0 to 1: its `origin`, or the value where that is nearer
   * the start. A render reads it as `range.fillFrom`.
   */
  readonly fillFrom?: string
  /**
   * The name of the value the element computes as how much of the track its
   * fill covers, 0 to 1. A render reads it as `range.fillSpan`.
   */
  readonly fillSpan?: string
  /**
   * The name of the value the element computes as where its fill ends
   * along the track, 0 to 1. A render reads it as `range.fillTo`.
   */
  readonly fillTo?: string
  /** The state the element is in while its control has focus the keyboard brought. */
  readonly focusVisible?: string
  /** The prop that holds the options the value is written with, as `Intl.NumberFormat` takes them. */
  readonly formatOptions?: string
  /**
   * The name of the value the element computes as where the value sits
   * along the track, 0 to 1. A render reads it as `range.fraction`.
   */
  readonly fraction?: string
  /** The prop that holds how many steps Page Up and Page Down take, where `pageStep` does not say how far. */
  readonly largeStep?: string
  /** The prop that holds the locale the value is written in. */
  readonly locale?: string
  /** The prop that holds the largest value. */
  readonly max?: string
  /** The prop that holds the smallest value. */
  readonly min?: string
  /**
   * The event sent before a move stands, which a handler can cancel, with
   * the value it would leave as `value`.
   */
  readonly onBeforeChange?: string
  /** The event sent once a move is done. */
  readonly onChange?: string
  /** The event sent once each move stands. */
  readonly onInput?: string
  /** The prop that holds `vertical` where the track stands on end, its maximum at the top. */
  readonly orientation?: string
  /** The prop that holds where the fill starts: `start`, `center`, or `end`. */
  readonly origin?: string
  /** The prop that holds how far Page Up and Page Down move the value. */
  readonly pageStep?: string
  /** The prop that holds the value. */
  readonly prop: string
  /**
   * The name of the value the element computes as its value, a number, as
   * a screen reader reads it. A render reads it as `range.reading`.
   */
  readonly reading?: string
  /** The prop that keeps the reader from moving the value, while they can still reach it and hear it. */
  readonly readonly?: string
  /**
   * The name of the value the element computes as its value written as a
   * reader sees it, in its format. A render reads it as `range.said`.
   */
  readonly said?: string
  /**
   * The name of the value the element computes as the words a screen reader
   * says for its value, where its format or its `valueText` asks for any. A
   * render reads it as `range.spoken`.
   */
  readonly spoken?: string
  /** The prop that holds how far one step moves the value. */
  readonly step?: string
  /** The prop that holds the sentence a screen reader says for the value, with `{value}` in its place. */
  readonly valueText?: string
}
