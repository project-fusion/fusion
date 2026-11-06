/**
 * How an element a reader picks files into says so in its headless source,
 * as a file input does. Read as syntax, as `tree.ts` says.
 */

/**
 * What an element a reader picks files into holds: the files chosen. A
 * `<Pressable picks>` in its render opens the picker, and a `<Pressable
 * removes>` inside the repeat over `list` takes its row's file out.
 *
 * **The web element holds `File`s and a phone holds the records the files
 * capability gives**, each a name, a size, a media type, and the URI its
 * content is read from. Both screen a pick by core's file-field rules: the
 * types `accept` names, `maxFileSize`, and `maxFiles` under `multiple`. A
 * pick replaces the files held, as a native file input's does.
 *
 * **Each change asks first.** `onBeforeChange` names the event sent before
 * the chosen files change, with their names as `value`, and a handler that
 * refuses it keeps the files the element had. `onInput` and `onChange`
 * follow a change that stands. `onReject` names the event sent once a pick
 * leaves files out, with each one and why.
 *
 * **The list is computed.** `list` names the value a repeat's `each` binds,
 * each entry's `key`, `name`, `size` and `kind` as its row writes them, and
 * `removeLabel`, the words its press that removes is named by.
 */
export interface Files {
  /** The prop that holds which files the picker offers and a pick takes, as a native `accept` list. */
  readonly accept?: string
  /** The prop that holds how a size under a kilobyte is written, with `{count}`. */
  readonly bytesLabel?: string
  /** The state the element is in while it holds a file. */
  readonly hasFiles?: string
  /** The name of the value the element computes as the chosen files, which a repeat's `each` binds. */
  readonly list: string
  /** The prop that holds the locale sizes and names are written in. */
  readonly locale?: string
  /** The prop that holds the most bytes one file may have. */
  readonly maxFileSize?: string
  /** The prop that holds the most files the element holds, under `multiple`. */
  readonly maxFiles?: string
  /** The prop that says whether the element holds more than one file. */
  readonly multiple?: string
  /** The event sent before the chosen files change, which a handler can cancel, with their names as `value`. */
  readonly onBeforeChange?: string
  /** The event sent once the chosen files changed. */
  readonly onChange?: string
  /** The event sent once the chosen files changed, before `onChange`. */
  readonly onInput?: string
  /** The event sent once a pick leaves files out, with each one and why. */
  readonly onReject?: string
  /** The prop that holds what a screen reader hears of the files a pick leaves out, with `{count}` and `{names}`. */
  readonly rejectedText?: string
  /** The prop that holds the words a press that removes is named by, with `{name}`. */
  readonly removeLabel?: string
  /** The prop that holds what a screen reader hears once a file is removed, with `{name}`. */
  readonly removedText?: string
}
