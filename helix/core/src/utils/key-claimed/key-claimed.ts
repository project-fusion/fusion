/**
 * Input types with no text to move a caret through and no value an arrow moves.
 *
 * Everything else claims the arrows for itself: a caret in a text field, a
 * spinner on `number`, a value on `range`, a group on `radio`.
 */
const CARETLESS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'reset', 'submit'])

/**
 * Whether a press was already the business of whatever it landed on.
 *
 * **For a container that binds keys over content it did not write**: a toolbar,
 * a viewer, a drilldown. Some of what they hold uses the same keys for itself,
 * and moving the container regardless makes an input inside it uneditable:
 * ArrowRight moves somewhere else, and `preventDefault` means the caret never
 * moves at all.
 *
 * `composedPath()[0]` rather than `event.target`, which is retargeted to the
 * control's host at the shadow boundary and cannot tell a text field inside a
 * component from the component itself.
 *
 * `defaultPrevented` first, because a control that has already answered the
 * press has said so in the way the platform provides, and a foreign control
 * this package has never heard of has no other way to say it.
 */
export const keyClaimed = (event: KeyboardEvent): boolean => {
  if (event.defaultPrevented) {
    return true
  }
  const inner = event.composedPath()[0]
  if (!(inner instanceof HTMLElement)) {
    return false
  }
  if (inner.isContentEditable || inner.localName === 'textarea' || inner.localName === 'select') {
    return true
  }
  return inner.localName === 'input' && !CARETLESS.has((inner as HTMLInputElement).type)
}
