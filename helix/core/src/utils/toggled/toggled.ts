/** What a press reads of a control that turns on and off. */
export interface ToggleState {
  /** Whether the control is checked, on, or pressed. Under `mixed`, the state a press turns away from. */
  readonly checked: boolean

  /** Whether the control is disabled. */
  readonly disabled: boolean

  /** Whether the control shows neither state, as an indeterminate checkbox does. */
  readonly mixed: boolean

  /** Whether a reader can see and focus the control and a press changes nothing. */
  readonly readOnly: boolean
}

/**
 * The state a press asks to turn a control to: the opposite of `checked`,
 * and never mixed, or `null` where the control takes no press.
 *
 * **Written by hand on the web, and specified by the toggle machine.**
 * Checkbox, Switch, a Toggle on its own, and Motion Toggle each turn through
 * this, and ask their cancelable event with what it returns. The machine's
 * spec holds it to the machine over every state.
 *
 * **A mixed control resolves to the opposite of the state under the dash**,
 * as a native checkbox does: an indeterminate box that is unchecked
 * underneath becomes checked, and one that is checked becomes unchecked.
 */
export const toggled = (state: ToggleState): ToggleState | null =>
  state.disabled || state.readOnly ? null : { ...state, checked: !state.checked, mixed: false }
