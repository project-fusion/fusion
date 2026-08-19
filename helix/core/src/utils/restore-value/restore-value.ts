/** A control whose text the element may have to put back. */
type TextControl = HTMLInputElement | HTMLTextAreaElement

/**
 * Puts a value back into a text control without moving the reader's caret.
 *
 * A controlled input has to restore what the element holds whenever the native
 * control has moved and the answer has not followed, which is a refusal or a
 * consumer who owns the value and has not answered yet. Assigning `value` is
 * how that is done, and per spec assigning a *different* string moves the text
 * entry cursor to the end. Measured: caret at index three in `abcdef`, assign
 * `abcXdef`, caret at seven. Assigning the same string leaves it alone, which
 * is why this was invisible until a consumer was slow.
 *
 * So a React consumer holding the value in state, which commits after the
 * event, put the caret at the end of the field after every single keystroke.
 * Typing in the middle of a word was impossible, and the class JSDoc claimed
 * the caret was the platform's business.
 *
 * The offset is adjusted by the length difference rather than clamped, because
 * the common case is exactly one character wide: the reader typed, the element
 * restored the shorter previous string, and the caret belongs one place back.
 * Clamping alone would leave it one to the right of where the reader was, which
 * is the same bug at a smaller size.
 *
 * Nothing is restored when the value already matches, since the assignment
 * itself is what moves the caret and there is nothing to assign.
 */
/**
 * Holds the caret across a write the element does not make itself.
 *
 * **Lit's `.value` binding moves the caret to the end, and only a controlled
 * field notices.** Measured in Chrome with real typing: place the caret after
 * `Ada` in `Ada Lovelace` and press one key, and an uncontrolled field reports
 * `AdaX Lovelace` with the caret at 4, while a controlled one reports the same
 * text with the caret at 13. Editing the middle of a controlled field was
 * impossible: every keystroke threw the caret to the end.
 *
 * The asymmetry is the interesting part. Uncontrolled, `handleInput` runs
 * `restoreValue` after the state has moved, so the control already holds the
 * new text and the call returns early; when Lit's binding then assigns the same
 * string, Chrome leaves the selection alone. Controlled, the control has been
 * put *back* to the old text while the consumer decides, so Lit assigns a
 * genuinely different string and the platform resets the selection, as it does
 * for any assignment to `value`.
 *
 * So the selection is taken before the update and put back after it, mapped by
 * however much the text grew or shrank, which is the same arithmetic
 * `restoreValue` does in one step. Returned as a closure rather than a pair of
 * fields so the two halves cannot be called out of order.
 *
 * The binding itself has to stay: it is what Lit SSR serializes, and a field
 * that filled in at hydration would flash empty for every reader on a slow
 * connection.
 */
export const holdCaret = (control: TextControl): (() => void) => {
  const { selectionDirection, selectionEnd, selectionStart } = control
  const held = control.value.length
  return () => {
    /* Null on a control with no selection, `<input type="range">` among them,
       where `setSelectionRange` throws rather than declining. */
    if (selectionStart === null || selectionEnd === null) {
      return
    }
    const delta = control.value.length - held
    const at = (point: number): number => Math.max(0, Math.min(control.value.length, point + delta))
    control.setSelectionRange(at(selectionStart), at(selectionEnd), selectionDirection ?? undefined)
  }
}

export const restoreValue = (control: TextControl, next: string): void => {
  if (control.value === next) {
    return
  }
  const { selectionDirection, selectionEnd, selectionStart } = control
  const delta = next.length - control.value.length
  control.value = next
  /* A control with no selection is done here, and this is a guard rather than a
     tidiness: `<input type="range">` reports `selectionStart` as null and
     *throws* `InvalidStateError` from `setSelectionRange`. Measured. The slider
     restores through this same util, which is what makes the check load-bearing
     rather than defensive. */
  if (selectionStart === null || selectionEnd === null) {
    return
  }
  const at = (point: number): number => Math.max(0, Math.min(next.length, point + delta))
  control.setSelectionRange(at(selectionStart), at(selectionEnd), selectionDirection ?? undefined)
}
