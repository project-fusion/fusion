import type { Left } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * An object inspector, as the React Native half of the conformance suite finds
 * its rows and reads what a screen reader hears of each.
 */

/** What a phone says of a row's level and place, read back from its value. */
const PLACE = /Level (\d+), (\d+) of (\d+)/

/** Whether the setup draws an object inspector. */
export const inspects = (run: Run): boolean =>
  formOf(run.scenario.setup.tag).api?.inspector !== undefined

/** The rows drawn, in order. */
export const inspectorRows = (): View[] =>
  (screen.root?.queryAll((node: View) =>
    PLACE.test(String(node.props.accessibilityValue?.text ?? '')),
  ) ?? []) as unknown as View[]

/** The node a row listens for keys on. */
export const rowNode = (run: Run, row: View | undefined): unknown => {
  const listening = new Set(run.listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = (row as any)?.unstable_fiber; fiber; fiber = fiber.return) {
    if (listening.has(fiber.stateNode)) {
      return fiber.stateNode
    }
  }
  return undefined
}

/** The words a view draws, with no spaces, each text once. */
const wordsIn = (view: View): string =>
  view
    .queryAll((node: View) => node.type === 'Text')
    .flatMap((node) => node.children.filter((one) => typeof one === 'string'))
    .join('')
    .replace(/\s/g, '')

/** What each row says, which rows a filter matched, which is active, and which holds focus. */
export const inspectorLeft = (run: Run): Pick<Left, 'inspector'> => {
  if (!inspects(run)) {
    return {}
  }
  const rows = inspectorRows()
  const states = HOST_STATES.get(run.scenario.setup.tag)
  const at = run.focus.focused()
  const focused = at === null ? -1 : rows.findIndex((row) => rowNode(run, row) === at)
  return {
    inspector: {
      active: String(states?.activePath ?? ''),
      focused: focused < 0 ? null : focused,
      matched: String(states?.matchedRows ?? ''),
      rows: rows.map((row) => {
        const place = PLACE.exec(String(row.props.accessibilityValue?.text ?? ''))
        return {
          expanded: row.props.accessibilityState?.expanded ?? null,
          level: Number(place?.[1] ?? 0),
          position: Number(place?.[2] ?? 0),
          size: Number(place?.[3] ?? 0),
          words: wordsIn(row),
        }
      }),
    },
  }
}
