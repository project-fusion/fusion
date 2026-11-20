import { setFiles } from '@fusion.dev/helix-core/capabilities/files'
import { type FakeFiles, fakeFiles } from '@fusion.dev/helix-core/capabilities/files/fake'
import type { Intent, Left } from '@fusion.dev/helix-testing/conformance'
import { act } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import { tap } from './input'
import { pressOf, type Run } from './views'

/*
 * Picking files, as the React Native half of the conformance suite performs
 * it: the fake files capability answers the picker the element's field
 * opens, as the web half answers the element's own file input.
 */

/** The fake picker a setup's elements pick through, set before the setup draws. */
let picker: FakeFiles = fakeFiles()

/** Sets a fresh fake picker as the files capability, before a setup draws. */
export const fakePicker = (): void => {
  picker = fakeFiles()
  setFiles(picker)
}

/** Whether the element with this tag holds files a reader picks. */
export const picksFiles = (tag: string): boolean => formOf(tag).api?.files !== undefined

/**
 * Sets the picker's answer, the files as the capability gives them, or a
 * closed picker where there are none, and presses the element's field, then
 * lets the answer arrive.
 */
export const pickIn = async (
  run: Run,
  intent: Extract<Intent, { kind: 'pick' }>,
): Promise<string | undefined> => {
  const { setup } = run.scenario
  if (!picksFiles(setup.tag)) {
    return 'The element picks no files.'
  }
  picker.next =
    intent.files.length === 0
      ? { files: [], outcome: 'dismissed' }
      : {
          files: intent.files.map((file) => ({ ...file, uri: `file:///cache/${file.name}` })),
          outcome: 'chosen',
        }
  const trigger = setup.props?.['trigger-label']
  await tap(pressOf(typeof trigger === 'string' ? trigger : 'Choose files'))
  await act(() => new Promise<void>((done) => setTimeout(done, 0)))
  return undefined
}

/** The names of the files the element holds, and whether it is marked wrong, for an element that picks files. */
export const filesLeft = (run: Run): Pick<Left, 'files' | 'invalid'> => {
  const { tag } = run.scenario.setup
  const list = formOf(tag).api?.files?.list
  if (list === undefined) {
    return {}
  }
  const states = HOST_STATES.get(tag) ?? {}
  const rows = states[list]
  return {
    files: Array.isArray(rows) ? rows.map((row) => String((row as { name?: unknown }).name)) : [],
    invalid: states.invalid === true,
  }
}
