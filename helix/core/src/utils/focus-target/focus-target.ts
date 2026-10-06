/** What takes focus inside a component that hands its focus on. */
const CONTROL =
  'a[href], button, input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])'

/**
 * The element focus lands on when a trigger is focused: the trigger itself,
 * or, for a component that delegates focus, the control inside its shadow root,
 * followed down through any component nested there.
 *
 * **What a description or a name has to be written on**, since a reader hears
 * the element that has focus: a tooltip describing a Helix button describes
 * the `<button>` inside it, and a badge counting on an icon button counts on
 * the same one. Read from outside through `shadowRoot`, so it works for any
 * component with an open root and names none.
 */
export const focusTarget = (trigger: Element): Element => {
  const root = trigger.shadowRoot
  if (!root?.delegatesFocus) {
    return trigger
  }
  const inner = root.querySelector(CONTROL)
  return inner ? focusTarget(inner) : trigger
}
