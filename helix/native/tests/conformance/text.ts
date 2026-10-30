import type { Intent, Left } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * Typing into an element's field, and leaving it, as the React Native half
 * of a conformance scenario performs them: each edit a change of the
 * `TextInput`'s text, as a keystroke is, with focus in the field first.
 */

/** The setup's one field, its `TextInput`. */
const fieldIn = (): View | undefined => {
  const root = screen.root
  return root === null
    ? undefined
    : [root, ...root.queryAll(() => true)].find((node) => node.type === 'TextInput')
}

/**
 * Where focus stands while the field has it: the node the field hears keys
 * on, where it hears any, as a number input's field steps with the arrows,
 * and the field itself otherwise.
 */
export const textFocus = (run: Run): unknown => {
  const field = fieldIn()
  const listening = new Set(run.listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = field?.unstable_fiber; fiber; fiber = fiber.return) {
    if (listening.has(fiber.stateNode)) {
      return fiber.stateNode
    }
  }
  return field
}

/** The text the field holds now. */
const textIn = (field: View): string => {
  const value = field.props.value
  return typeof value === 'string' ? value : ''
}

/**
 * Puts focus in the field, as a reader taps it or tabs to it, where it is
 * not there already: the node it hears keys on, and its focus. **A disabled
 * field takes none.**
 */
export const focusField = async (run: Run): Promise<void> => {
  const field = fieldIn()
  if (field === undefined) {
    return
  }
  const state = field.props.accessibilityState as { readonly disabled?: boolean } | undefined
  if (state?.disabled === true || run.focus.focused() === textFocus(run)) {
    return
  }
  run.focus.place(textFocus(run))
  await fireEvent(field, 'focus')
}

/**
 * Types `text` into the field, a character an edit, and erases `erase`
 * characters from its end first, with focus in the field. **A disabled
 * field takes neither focus nor an edit, and a read-only one takes focus and
 * no edit**, as the web's does: its `TextInput` is not editable.
 */
export const typeInto = async (
  run: Run,
  intent: Extract<Intent, { kind: 'type' }>,
): Promise<string | undefined> => {
  const field = fieldIn()
  if (field === undefined) {
    return 'The setup draws no field to type into.'
  }
  const state = field.props.accessibilityState as { readonly disabled?: boolean } | undefined
  if (state?.disabled === true) {
    return undefined
  }
  await focusField(run)
  if (field.props.editable === false) {
    return undefined
  }
  /* The text an edit leaves: at the end, or where the field's selection stands. */
  const edited = (now: typeof field, character: string): string => {
    const text = textIn(now)
    const selection = now.props.selection as { end: number; start: number } | undefined
    if (intent.selection !== true || selection === undefined) {
      return character === '' ? text.slice(0, -1) : `${text}${character}`
    }
    const start =
      character === '' && selection.start === selection.end
        ? Math.max(0, selection.start - 1)
        : selection.start
    return `${text.slice(0, start)}${character}${text.slice(selection.end)}`
  }
  for (let left = intent.erase ?? 0; left > 0; left -= 1) {
    const now = fieldIn() ?? field
    await act(async () => {
      await fireEvent.changeText(now, edited(now, ''))
    })
  }
  for (const character of intent.text ?? '') {
    const now = fieldIn() ?? field
    await act(async () => {
      await fireEvent.changeText(now, edited(now, character))
    })
  }
  return undefined
}

/** A press on the box at `at`, which holds the press a Pin Input's machine lays on each. */
export const pressBox = async (run: Run, at: number): Promise<string | undefined> => {
  const boxes = screen.root?.queryAll(
    (node) => typeof node.props.onResponderRelease === 'function' && node.type === 'View',
  )
  const box = boxes?.[at]
  if (box === undefined) {
    return `The setup draws no box ${at}.`
  }
  await focusField(run)
  await act(async () => {
    await fireEvent(box, 'responderRelease')
  })
  return undefined
}

/** Moves focus out of the field, as a reader moves on. */
export const leave = async (run: Run): Promise<string | undefined> => {
  const field = fieldIn()
  if (field === undefined) {
    return 'The setup draws no field to leave.'
  }
  if (run.focus.focused() !== textFocus(run)) {
    return undefined
  }
  run.focus.place(null)
  await fireEvent(field, 'blur')
  return undefined
}

/** What the field holds and whether the element is marked wrong, for a family a reader types into. */
export const textLeft = (run: Run): Pick<Left, 'text'> => {
  const { tag } = run.scenario.setup
  if (formOf(tag).api?.entry === undefined) {
    return {}
  }
  const field = fieldIn()
  return {
    text: {
      invalid: HOST_STATES.get(tag)?.invalid === true,
      value: field === undefined ? '' : textIn(field),
    },
  }
}
