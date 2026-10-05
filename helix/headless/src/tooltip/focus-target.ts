/** What takes focus inside a component that hands its focus on. */
const CONTROL =
  'a[href], button, input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])'

/**
 * The element focus lands on when a trigger is focused: the trigger itself,
 * or, for a component that delegates focus, the control inside its shadow root,
 * followed down through any component nested there.
 */
export const focusTarget = (trigger: Element): Element => {
  const root = trigger.shadowRoot
  if (!root?.delegatesFocus) {
    return trigger
  }
  const inner = root.querySelector(CONTROL)
  return inner ? focusTarget(inner) : trigger
}
