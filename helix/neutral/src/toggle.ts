/**
 * How an element that turns on and off says so in its headless source, as a
 * checkbox, a switch, and an accordion section do.
 */

/**
 * What an element that turns on and off holds. A checkbox is checked, a
 * switch is on, and a toggle button is pressed. The pressable that `toggles`
 * is the part a press turns it with.
 */
export interface Toggle {
  /**
   * The event sent once the element has turned, or several in the order
   * they are sent, as a checkbox sends `input` and then `change`.
   */
  readonly after?: string | readonly string[]
  /**
   * The event sent before it turns, which a handler can cancel.
   */
  readonly before?: string
  /**
   * The event sent once it stands the other way, however it came to: a
   * press, the page writing its prop, or its set, as an accordion section
   * sends `toggle`. Its detail is `newState` and `oldState`, each `open` or
   * `closed`, as the platform's `ToggleEvent` carries them.
   */
  readonly changes?: string
  /**
   * The prop that holds whether it is checked, on, or pressed. Absent where
   * the runtime holds it, under `held`.
   */
  readonly checked?: string
  /**
   * The event sent once it stands closed, however it came to, after
   * `changes`, as a dialog sends `close`.
   */
  readonly closed?: string
  /**
   * The event sent before it closes, which a handler can cancel, as an
   * accordion section's `before-close`. Named with `opens`, in place of
   * `before`.
   */
  readonly closes?: string
  /**
   * Whether Escape on its pressable that `toggles` closes it as a press
   * does, as a toast item's dismiss button closes its message. Named with
   * `closes`.
   */
  readonly escapes?: true
  /**
   * What the runtime holds whether it is checked in, where no prop holds it:
   * `page-motion`, whether the page's motion is paused, which every Motion
   * Toggle on a page shares. The web keeps it on the document element, and a
   * phone in the native runtime.
   */
  readonly held?: 'page-motion'
  /**
   * The prop that seeds it where nothing sets it.
   */
  readonly initial?: string
  /**
   * The prop that shows it as neither, as an indeterminate checkbox does. A
   * press resolves it to the opposite of the state under it.
   */
  readonly mixed?: string
  /**
   * The event sent before it opens, which a handler can cancel, as an
   * accordion section's `before-open`. Named with `closes`.
   */
  readonly opens?: string
  /**
   * The prop that keeps a press from changing it, while a reader can still
   * see and focus it.
   */
  readonly readonly?: string
}

/** What an element that turns on and off holds. */
export const toggle = (fields: Toggle): Toggle => fields
