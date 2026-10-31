import type { Left, Scenario } from '@fusion.dev/helix-testing/conformance'
import { fireEvent, screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * A table, as the React Native half of the conformance suite finds its presses
 * and reads what a screen reader hears of each row it draws. Each box a table
 * draws says where it stands in its `testID`, `table:<row>/<track>`.
 */

/** Whether a setup draws a table. */
export const isTable = (scenario: Scenario): boolean =>
  formOf(scenario.setup.tag).api?.tableRoot !== undefined

const byId = (id: string): View | undefined =>
  screen.root?.queryAll((node: View) => node.props.testID === id)[0] as View | undefined

const CELL = /^table:(.*)\/(\d+)$/

const answers = (node: View) => typeof node.props.onResponderGrant === 'function'

/** The press an intent names: a row, a part of a row, or a part of the table. */
export const tablePress = (
  item: string | undefined,
  part: string | undefined,
): View | undefined => {
  if (part === undefined) {
    return byId(`table-row:${item}`)
  }
  const inside = part === 'checkbox' ? (item === undefined ? 'select-all' : 'select') : part
  const found = byId(`table:${item ?? 'head'}:${inside}`)
  if (found === undefined || answers(found)) {
    return found
  }
  return found.queryAll(answers)[0] as View | undefined
}

/** The row whose grip a screen reader last adjusted, which holds focus on it. */
const held = new WeakMap<Run, string>()

/** Adjusts a row's grip as a screen reader does. */
export const moveRow = async (run: Run, item: string, by: number): Promise<string | undefined> => {
  const grip = byId(`table:${item}:grip-button`)
  if (grip === undefined) {
    return 'The row draws no grip to adjust.'
  }
  held.set(run, item)
  run.focus.place(grip)
  await fireEvent(grip, 'accessibilityAction', {
    nativeEvent: { actionName: by > 0 ? 'increment' : 'decrement' },
  })
  return undefined
}

/** The boxes of a row's or the headings' leading columns, by what each is called. */
const LEADS: Readonly<Record<string, string>> = {
  expand: 'expand',
  'expand-head': 'expand',
  grip: 'grip',
  'grip-head': 'grip',
  select: 'select',
  'select-all': 'select',
}

const LEAD = /^table:(.*):([a-z-]+)$/

/** Whether a box is a cell a grid's stop may stand on. */
const isCell = (node: View): boolean => {
  const id = String(node.props.testID ?? '')
  return CELL.test(id) || LEADS[LEAD.exec(id)?.[2] ?? ''] !== undefined
}

/** A grid's stop: the one box that takes focus. */
const stopView = (): View | undefined =>
  screen.root?.queryAll((node: View) => node.props.focusable === true && isCell(node))[0] as
    | View
    | undefined

/** A stop as the record holds it: the row's key and the column. */
const stopOf = (view: View | undefined, leads: readonly string[]): string => {
  const id = String(view?.props.testID ?? '')
  const lead = LEAD.exec(id)
  return lead === null
    ? id.replace(/^table:/, '')
    : `${lead[1]}/${leads.indexOf(LEADS[lead[2] ?? ''] ?? '')}`
}

/** The leading columns a table draws, read from the boxes of its headings and rows. */
const leadsIn = (): readonly string[] => {
  const ids = (screen.root?.queryAll(isCell) ?? []).map((node: View) =>
    String(node.props.testID ?? ''),
  )
  return ['grip', 'select', 'expand'].filter((name) =>
    ids.some((id: string) => LEADS[LEAD.exec(id)?.[2] ?? ''] === name),
  )
}

/** Puts focus on a grid's stop, and on the node it listens on. */
export const focusStop = async (run: Run): Promise<void> => {
  const view = stopView()
  const listening = new Set(run.listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = (view as any)?.unstable_fiber; fiber; fiber = fiber.return) {
    if (listening.has(fiber.stateNode)) {
      run.focus.place(fiber.stateNode)
      break
    }
  }
  if (view !== undefined) {
    await fireEvent(view, 'focus')
  }
}

/** The words a view draws, each text once. */
const wordsIn = (view: View): string =>
  view
    .queryAll((node: View) => node.type === 'Text')
    .flatMap((node) => node.children.filter((one) => typeof one === 'string'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

/** The row or the column focus stands in: a grid's stop, and nothing in a table with none. */
const tableFocused = (run: Run, holder: string): string | null => {
  const adjusted = held.get(run)
  if (adjusted !== undefined) {
    return adjusted
  }
  if (run.focus.focused() === null || stopView() === undefined) {
    return null
  }
  return holder === 'head' ? headingFocused(run) : holder
}

/** The column whose heading holds a grid's stop. */
const headingFocused = (run: Run): string | null => {
  const track = Number(/\/(\d+)$/.exec(String(stopView()?.props.testID ?? ''))?.[1] ?? -1)
  const lead = Number(HOST_STATES.get(run.scenario.setup.tag)?.leadCount ?? 0)
  const columns = (run.scenario.setup.children ?? []).filter(
    (child) => typeof child !== 'string' && child.tag === 'helix-table-column',
  )
  const column = columns[track - lead]
  return typeof column === 'object' ? String(column.props?.value ?? '') : run.scenario.setup.tag
}

/** The first box under each `testID`: a wrapper hands its id down to what it draws. */
const firstOfEach = (boxes: readonly View[]): View[] => {
  const seen = new Set<unknown>()
  return boxes.filter((box) => {
    const fresh = !seen.has(box.props.testID)
    seen.add(box.props.testID)
    return fresh
  })
}

/** Each row's boxes of words, in the order the rows are drawn. */
const cellsByRow = (boxes: readonly View[], lead: number): Map<string, View[]> => {
  const cells = new Map<string, View[]>()
  for (const box of boxes) {
    const [, key = '', track = '0'] = CELL.exec(String(box.props.testID)) ?? []
    if (key !== 'head' && Number(track) >= lead) {
      cells.set(key, [...(cells.get(key) ?? []), box])
    }
  }
  return cells
}

/** What each row says, what is selected and sorted, and where the stop stands. */
export const tableLeft = (run: Run): Partial<Pick<Left, 'chosen' | 'focused' | 'table'>> => {
  if (!isTable(run.scenario)) {
    return {}
  }
  const states = HOST_STATES.get(run.scenario.setup.tag)
  const lead = Number(states?.leadCount ?? 0)
  const boxes = (screen.root?.queryAll((node: View) =>
    CELL.test(String(node.props.testID ?? '')),
  ) ?? []) as View[]
  const unique = firstOfEach(boxes)
  const heads = unique.filter(
    (box) =>
      String(box.props.testID).startsWith('table:head/') &&
      Number(CELL.exec(String(box.props.testID))?.[2]) >= lead,
  )
  const cells = cellsByRow(unique, lead)
  const keys = [...cells.keys()]
  const stop = stopOf(stopView(), leadsIn())
  const chosen = String(states?.chosen ?? '')
  const holder = stop.slice(0, stop.lastIndexOf('/'))
  return {
    chosen: chosen === '' ? [] : chosen.split(','),
    focused: tableFocused(run, holder),
    table: {
      heads: heads.map((box) => {
        const sorted = box.queryAll(
          (node: View) => node.props.accessibilityValue?.text !== undefined,
        )
        return {
          sorted: (sorted[0]?.props.accessibilityValue?.text as string | undefined) ?? null,
          words: wordsIn(box),
        }
      }),
      rows: keys.map((key) => {
        const own = cells.get(key) ?? []
        const button = byId(`table:${key}:expand-button`)
        return {
          cells: own.map((box) => String(box.props.accessibilityLabel ?? wordsIn(box))),
          disabled: own[0]?.props.accessibilityState?.disabled === true,
          expanded:
            button === undefined ? null : button.props.accessibilityState?.expanded === true,
          key,
        }
      }),
      selected: String(states?.chosen ?? ''),
      sort: String(states?.sorted ?? ''),
      stop,
    },
  }
}
