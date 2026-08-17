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
export const restoreValue = (control: TextControl, next: string): void => {
  if (control.value === next) {
    return
  }
  const { selectionDirection, selectionEnd, selectionStart } = control
  const delta = next.length - control.value.length
  control.value = next
  if (selectionStart === null || selectionEnd === null) {
    return
  }
  const at = (point: number): number => Math.max(0, Math.min(next.length, point + delta))
  control.setSelectionRange(at(selectionStart), at(selectionEnd), selectionDirection ?? undefined)
}
