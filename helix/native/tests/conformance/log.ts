import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * A log, as the React Native half of the conformance suite finds its rows and
 * reads what a screen reader hears of each.
 */

/** What a setup hands a log as data. */
export const logProps = (setup: Setup): Readonly<Record<string, unknown>> =>
  setup.logLines === undefined ? {} : { groups: setup.logGroups ?? [], lines: setup.logLines }

/** What a number that takes a press is named. */
const NUMBER = /^Line \d+$/

/** Whether the setup draws a log. */
export const logs = (setup: Setup): boolean => formOf(setup.tag).api?.logRoot !== undefined

/** The rows drawn, in order: a step's press, or a line, each named by what it says. */
export const logRows = (setup: Setup): View[] => {
  const name = String(setup.props?.label ?? '')
  return (screen.root?.queryAll((node: View) => {
    const label = node.props.accessibilityLabel
    return (
      node.type === 'View' && typeof label === 'string' && label !== name && !NUMBER.test(label)
    )
  }) ?? []) as unknown as View[]
}

/** What a press on a row lands on: a line's number, or the row itself. */
export const logPress = (row: View | undefined): View | undefined =>
  (row?.queryAll((node: View) =>
    NUMBER.test(String(node.props.accessibilityLabel ?? '')),
  )[0] as unknown as View | undefined) ?? row

/** What each row says, what the log let go, and the lines selected. */
export const logLeft = (run: Run, selected: string): Pick<Left, 'log'> => {
  if (!logs(run.scenario.setup)) {
    return {}
  }
  const states = HOST_STATES.get(run.scenario.setup.tag)
  return {
    log: {
      dropped: String(states?.['dropped-words'] ?? ''),
      rows: logRows(run.scenario.setup).map((row) => ({
        expanded: row.props.accessibilityState?.expanded ?? null,
        words: String(row.props.accessibilityLabel).replace(/\s/g, ''),
      })),
      selected,
    },
  }
}
