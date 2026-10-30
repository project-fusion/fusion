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
 *
 * **A range whose control is a `<View role="radiogroup">` is a score a
 * reader picks from a row of steps**, as a rating's: the steps run from
 * `step` to `max`, those below `min` left out, and its value is empty until
 * a reader picks one. A press or a drag across the row picks the step under
 * the finger as it lets go, and shows the step under it while it moves,
 * sent as `onPreview`. The arrow keys pick the step after or before, Home
 * and End the first and the last, and a screen reader's increment and
 * decrement the same. Where `clearable` holds, a press on the score chosen,
 * or Backspace or Delete, takes it back to none, and `onClear` follows.
 *
 * **A range whose control is a `<View role="separator">` is the divider of
 * a split a reader moves between two panes**, as a splitter's: its value is
 * the first pane's share of the element, as a percentage. A drag on the
 * divider moves it with the finger and stands as it lets go, a double tap
 * puts it back at its seed, the arrows along its axis move it by `step`,
 * Home and End take it to its bounds, Enter shuts the first pane and opens
 * it again, and a screen reader's increment and decrement move it by a
 * step. A divider moved to an edge a pane can shut at shuts that pane,
 * which `collapsed` holds and `onBeforeCollapse` asks for first.
 */
export interface ValueRange {
  /** The state the element is in while its value stands at its largest. */
  readonly atMax?: string
  /** The state the element is in while its value stands at its smallest. */
  readonly atMin?: string
  /**
   * The name of the value the element computes as where a split's divider
   * stands, as a percentage of the element, such as `40%`. A render reads
   * it as `range.basis`.
   */
  readonly basis?: string
  /** The prop that lets a reader take a score back to none, by a press on the score chosen, or Backspace or Delete. */
  readonly clearable?: string
  /** The prop that holds which pane of a split is shut, `start` or `end`. */
  readonly collapsed?: string
  /** The prop that holds the words a screen reader says for a split's divider while a pane is shut. */
  readonly collapsedLabel?: string
  /** The prop that holds how much of a shut pane still shows, as a percentage. */
  readonly collapsedSize?: string
  /** The state the element is in while a pane of a split is shut. */
  readonly collapsedState?: string
  /** The prop that holds which panes a reader can shut: `start`, `end`, `both`, or `none`. */
  readonly collapsible?: string
  /** The prop that seeds which pane of a split is shut, where nothing sets it. */
  readonly defaultCollapsed?: string
  /** The prop that seeds the value where nothing sets it, as `defaultValue`. */
  readonly defaultProp?: string
  /** The state the element is in while a reader drags it. */
  readonly dragging?: string
  /** The prop that holds the least a split's end pane keeps, in the units `min` takes. */
  readonly endMin?: string
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
  /**
   * The name of the value the element computes as whether a split's divider
   * stands against an edge with no pane beside it. A render reads it as
   * `range.flush`.
   */
  readonly flush?: string
  /** The state the element is in while its control has focus the keyboard brought. */
  readonly focusVisible?: string
  /** The prop that holds the options the value is written with, as `Intl.NumberFormat` takes them. */
  readonly formatOptions?: string
  /**
   * The name of the value the element computes as where the value sits
   * along the track, 0 to 1. A render reads it as `range.fraction`.
   */
  readonly fraction?: string
  /**
   * The name of the value the element computes as how many marks the score
   * it shows fills whole, as a rating's. A render reads it as `range.full`.
   */
  readonly full?: string
  /**
   * The name of the value the element computes as the largest value a
   * screen reader hears it may take. A render reads it as `range.highest`.
   */
  readonly highest?: string
  /** The prop that holds how many steps Page Up and Page Down take, where `pageStep` does not say how far. */
  readonly largeStep?: string
  /** The prop that holds the locale the value is written in. */
  readonly locale?: string
  /**
   * The name of the value the element computes as the smallest value a
   * screen reader hears it may take. A render reads it as `range.lowest`.
   */
  readonly lowest?: string
  /** The prop that holds the largest value. */
  readonly max?: string
  /** The prop that holds the smallest value. */
  readonly min?: string
  /**
   * The event sent before a move stands, which a handler can cancel, with
   * the value it would leave as `value`.
   */
  readonly onBeforeChange?: string
  /**
   * The event sent before a pane of a split shuts or opens, which a handler
   * can cancel, with the pane shut as `value`, or `''` where both stand open.
   */
  readonly onBeforeCollapse?: string
  /** The event sent once a move is done. */
  readonly onChange?: string
  /** The event sent once a score is taken back to none, after `onInput` and `onChange`. */
  readonly onClear?: string
  /** The event sent once a pane of a split shuts or opens, with the pane shut as `value`. */
  readonly onCollapse?: string
  /** The event sent once each move stands. */
  readonly onInput?: string
  /**
   * The event sent as the score a reader's drag shows changes, with that
   * score as `value`, or `''` once the element shows its own score again.
   */
  readonly onPreview?: string
  /** The prop that holds the words each score is named by, with `{score}` and `{max}` in their places. */
  readonly optionLabel?: string
  /** The prop that holds `vertical` where the track stands on end, its maximum at the top. */
  readonly orientation?: string
  /** The prop that holds where the fill starts: `start`, `center`, or `end`. */
  readonly origin?: string
  /** The prop that holds how far Page Up and Page Down move the value. */
  readonly pageStep?: string
  /**
   * The name of the value the element computes as how much of the mark
   * after the whole ones the score it shows fills, 0 to 1, as a rating's.
   * A render reads it as `range.part`.
   */
  readonly part?: string
  /** The prop that holds the pane of a split that keeps its length as the element's own length changes. */
  readonly primary?: string
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
  /** The prop that holds the places a split's dragged divider snaps to, comma separated. */
  readonly snap?: string
  /** The prop that holds how close, in points, a drag comes to a snap place to land on it. */
  readonly snapThreshold?: string
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
  /** The prop that lets a drag on the part `grip` names change a number. */
  readonly scrub?: string
  /** The part a drag takes hold of under `scrub`. */
  readonly grip?: string
  /** The state the element is in while a drag on its `grip` holds. */
  readonly scrubbing?: string
  /** The prop that gives the range a thumb for each value of its text. */
  readonly several?: string
  /** The prop that holds how many steps the thumbs stay apart. */
  readonly minStepsBetween?: string
  /** The prop that holds the words that join the first and the last value. */
  readonly rangeText?: string
  /** The prop that holds the name of the lowest thumb. */
  readonly minimumLabel?: string
  /** The prop that holds the name of the highest thumb. */
  readonly maximumLabel?: string
  /** The prop that holds the name of a thumb between the two. */
  readonly thumbLabel?: string
  /** The prop that names the control, which each thumb's name starts with. */
  readonly label?: string
  /** The prop that holds the function that writes a value. */
  readonly formatter?: string
  /** The value it computes as its thumbs, one entry each, which a repeat reads. */
  readonly thumbs?: string
  /** The state the element is in while a split's panes stand one above the other. */
  readonly vertical?: string
}
