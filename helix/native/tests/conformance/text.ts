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

/** The text the field holds now. */
const textIn = (field: View): string => {
  const value = field.props.value
  return typeof value === 'string' ? value : ''
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
  if (run.focus.focused() !== field) {
    run.focus.place(field)
    await fireEvent(field, 'focus')
  }
  if (field.props.editable === false) {
    return undefined
  }
  for (let left = intent.erase ?? 0; left > 0; left -= 1) {
    const now = fieldIn() ?? field
    await act(async () => {
      await fireEvent.changeText(now, textIn(now).slice(0, -1))
    })
  }
  for (const character of intent.text ?? '') {
    const now = fieldIn() ?? field
    await act(async () => {
      await fireEvent.changeText(now, `${textIn(now)}${character}`)
    })
  }
  return undefined
}

/** Moves focus out of the field, as a reader moves on. */
export const leave = async (run: Run): Promise<string | undefined> => {
  const field = fieldIn()
  if (field === undefined) {
    return 'The setup draws no field to leave.'
  }
  if (run.focus.focused() !== field) {
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
