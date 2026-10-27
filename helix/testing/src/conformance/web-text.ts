import type { Intent } from './format.js'
import { deepActive, type Mounted } from './web-left.js'

/*
 * Typing into an element's field, and leaving it, as the web half of a
 * conformance scenario performs them: each edit made by the browser's
 * editing command, which sends `input` as a keystroke does, and `change` as
 * focus leaves a field whose text changed.
 */

/** A field's control: the `<input>` or `<textarea>` a reader types into. */
type Control = HTMLInputElement | HTMLTextAreaElement

/** The text each control held as it gained focus, which `leave` compares with. */
const atFocus = new WeakMap<Control, string>()

/** The controls whose text a script wrote, which the browser commits nothing for. */
const written = new WeakSet<Control>()

/** Whether `at` is a control a reader types into. */
const isControl = (at: unknown): at is Control =>
  at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement

/** The element's field, inside its shadow root. */
export const controlOf = (mounted: Mounted): Control | undefined => {
  const found = mounted.root.shadowRoot?.querySelector('[part~="control"]')
  return isControl(found) ? found : undefined
}

/**
 * Keeps the text each field holds as it gains focus, for as long as the
 * setup is mounted, as a browser keeps it to decide on `change`.
 */
export const watchFocus = (mounted: Mounted): (() => void) => {
  const heard = () => {
    const at = deepActive()
    if (isControl(at)) {
      atFocus.set(at, at.value)
    }
  }
  mounted.root.addEventListener('focusin', heard)
  return () => mounted.root.removeEventListener('focusin', heard)
}

/**
 * One edit, made as the browser makes a reader's: `insertText` or `delete`
 * at the end of the text, through the editing command, which sends
 * `beforeinput` and `input` itself. A browser that has no such command gets
 * the text written and `input` sent. **Either is a script's edit**, which
 * `minlength` and `maxlength` never hold against.
 */
const edit = (control: Control, next: string, inputType: string, data: string | null): void => {
  /* An email field has no selection a script may move, and its caret stands at the end. */
  try {
    control.setSelectionRange(control.value.length, control.value.length)
  } catch {
    /* Typed where the caret stands. */
  }
  const command = data === null ? 'delete' : 'insertText'
  if (document.execCommand(command, false, data ?? undefined)) {
    return
  }
  written.add(control)
  control.value = next
  control.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data, inputType }))
}

/**
 * Types `text` into the field, a character an edit, and erases `erase`
 * characters from its end first, with focus in the field. **A disabled or
 * read-only field takes no edit**, as a browser types nothing into one, and
 * a read-only one still takes focus.
 */
export const typeInto = async (
  mounted: Mounted,
  intent: Extract<Intent, { kind: 'type' }>,
  settle: () => Promise<void>,
): Promise<void> => {
  const control = controlOf(mounted)
  if (control === undefined || control.disabled) {
    return
  }
  if (deepActive() !== control) {
    control.focus()
  }
  if (control.readOnly) {
    return
  }
  for (let left = intent.erase ?? 0; left > 0; left -= 1) {
    edit(control, control.value.slice(0, -1), 'deleteContentBackward', null)
    await settle()
  }
  for (const character of intent.text ?? '') {
    edit(control, `${control.value}${character}`, 'insertText', character)
    await settle()
  }
}

/**
 * Moves focus out of the field. **The browser commits an edit it made with
 * `change`** as the field loses focus, and the text a script wrote is
 * committed here as the browser would commit a reader's.
 */
export const leave = (mounted: Mounted): void => {
  const control = controlOf(mounted)
  if (control === undefined || deepActive() !== control) {
    return
  }
  if (written.has(control) && control.value !== (atFocus.get(control) ?? control.defaultValue)) {
    control.dispatchEvent(new Event('change', { bubbles: true }))
  }
  written.delete(control)
  control.blur()
}
