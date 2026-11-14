import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { formOf, HOST_STATES } from './forms'
import { nodeOf, type Run } from './views'

/*
 * A list of data, as the React Native half of the conformance suite finds
 * its rows and reads what it holds.
 */

/** The words of the item at `row` of a setup's `items`. */
export const rowWords = (setup: Setup, row: number): string => {
  const item = setup.items?.[row]
  const field = String(setup.props?.['text-field'] ?? '')
  return typeof item === 'object' && item !== null
    ? String((item as Readonly<Record<string, unknown>>)[field])
    : String(item)
}

/** Whether the row at `row` is disabled: a press there is none, as a phone's disabled press hears no touch. */
export const rowDisabled = (setup: Setup, row: number): boolean =>
  String(setup.props?.['disabled-keys'] ?? '')
    .split(',')
    .includes(rowWords(setup, row))

/** The keys chosen and the row with focus, as the window machine holds them. */
export const windowLeft = (run: Run): Pick<Left, 'window'> => {
  const { setup } = run.scenario
  if (formOf(setup.tag).api?.window === undefined) {
    return {}
  }
  const at = run.focus.focused()
  const focused = (setup.items ?? []).findIndex(
    (_, row) => at !== null && !rowDisabled(setup, row) && nodeOf(run, rowWords(setup, row)) === at,
  )
  return {
    window: {
      chosen: String(HOST_STATES.get(setup.tag)?.chosen ?? ''),
      focused: focused < 0 ? null : focused,
    },
  }
}
