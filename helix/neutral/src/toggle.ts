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
  readonly onChange?: string | readonly string[]
  /**
   * The event sent before it turns, which a handler can cancel.
   */
  readonly onBeforeChange?: string
  /**
   * The event sent once it stands the other way, however it came to: a
   * press, the page writing its prop, or its set, as an accordion section
   * sends `toggle`. Its detail is `newState` and `oldState`, each `open` or
   * `closed`, as the platform's `ToggleEvent` carries them.
   */
  readonly onToggle?: string
  /**
   * The prop that holds whether it is checked, on, or pressed. Absent where
   * the runtime holds it, under `shared`.
   */
  readonly prop?: string
  /**
   * The event sent once it stands closed, however it came to, after
   * `onToggle`, as a dialog sends `close`.
   */
  readonly onClose?: string
  /**
   * The event sent before it closes, which a handler can cancel, as an
   * accordion section's `before-close`. Named with `onBeforeOpen`, in
   * place of `onBeforeChange`.
   */
  readonly onBeforeClose?: string
  /**
   * Whether Escape on its pressable that `toggles` closes it as a press
   * does, as a toast item's dismiss button closes its message. Named with
   * `onBeforeClose`.
   */
  readonly closeOnEscape?: true
  /**
   * What the runtime holds whether it is checked in, where no prop holds it:
   * `page-motion`, whether the page's motion is paused, which every Motion
   * Toggle on a page shares. The web keeps it on the document element, and a
   * phone in the native runtime.
   */
  readonly shared?: 'page-motion'
  /**
   * The prop that seeds it where nothing sets it.
   */
  readonly defaultProp?: string
  /**
   * The prop that shows it as neither, as an indeterminate checkbox does. A
   * press resolves it to the opposite of the state under it.
   */
  readonly indeterminate?: string
  /**
   * The event sent before it opens, which a handler can cancel, as an
   * accordion section's `before-open`. Named with `onBeforeClose`.
   */
  readonly onBeforeOpen?: string
  /**
   * The prop that keeps a press from changing it, while a reader can still
   * see and focus it.
   */
  readonly readonly?: string
}
