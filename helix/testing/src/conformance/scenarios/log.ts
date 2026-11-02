import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Log, whose lines here arrive as data, few enough that every
 * row is drawn on both platforms. Each one names a row by its place among the
 * rows drawn: a press lands on a line's number, or on a step's heading. The
 * record says what a screen reader hears of each row, which step is open, which
 * lines are selected, and what the log says it let go.
 */

const LINES = [
  { level: 'info', text: 'Ready in 412 ms' },
  { level: 'debug', text: 'Watching 1,204 files' },
  { level: 'warn', text: 'glob is deprecated' },
  { level: 'error', text: 'Cannot find module' },
  { text: '\u001b[32mpassed\u001b[0m 12 specs' },
]

const STEPPED = [
  { group: 'install', text: 'Resolved 1,214 packages' },
  { group: 'install', text: 'Installed 1,214 packages' },
  { group: 'build', level: 'error', text: 'Build failed' },
]

const GROUPS = [
  { duration: '38s', heading: 'Install', id: 'install', status: 'done' },
  { duration: '12s', heading: 'Build', id: 'build', open: true, status: 'failed' },
]

/** A log of `lines`, with its props. */
const log = (
  props: Readonly<Record<string, PropValue>> = {},
  lines: readonly object[] = LINES,
  groups?: readonly object[],
): Setup => ({
  ...el('helix-log', { label: 'Build', ...props }),
  logGroups: groups,
  logLines: lines,
})

const press = (row: number) => ({ kind: 'press' as const, row })
/** A press past the last row, which changes nothing and reads what stands. */
const READ = { kind: 'press' as const, row: 99 }
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Logs: what each line says, steps that fold, a search, and a selection of lines. */
export const LOG: readonly Scenario[] = [
  {
    family: 'log',
    intents: [READ],
    name: 'each line says its level and its words',
    setup: log(),
  },
  {
    family: 'log',
    intents: [READ],
    name: 'only the lines as loud as `level` stand',
    setup: log({ level: 'warn' }),
  },
  {
    family: 'log',
    intents: [READ],
    name: 'only the lines that hold `query` stand',
    setup: log({ query: 'CANNOT' }),
  },
  {
    family: 'log',
    intents: [READ],
    name: 'a line written again folds under `collapse`, and says how many times',
    setup: log({ collapse: true }, [{ text: 'again' }, { text: 'again' }, { text: 'once' }]),
  },
  {
    family: 'log',
    intents: [READ],
    name: '`limit` lets the oldest lines go, and says how many',
    setup: log({ limit: 2 }),
  },
  {
    family: 'log',
    intents: [press(0), press(0)],
    name: 'a press on a step opens and closes it',
    setup: log({}, STEPPED, GROUPS),
  },
  {
    family: 'log',
    intents: [press(1)],
    name: 'a press on an open step closes it',
    setup: log({}, STEPPED, GROUPS),
  },
  {
    family: 'log',
    intents: [press(1), press(3)],
    name: 'a press on a number selects its line under selectable',
    setup: log({ 'line-numbers': true, selectable: true }),
  },
  {
    family: 'log',
    intents: [refuse('before-select'), press(1)],
    name: 'a refused selection leaves the lines as they were',
    setup: log({ 'line-numbers': true, selectable: true }),
  },
  {
    family: 'log',
    intents: [READ],
    name: 'a selection set from the start marks its lines',
    setup: log({
      'line-numbers': true,
      'mark-lines': '1',
      selectable: true,
      'selected-lines': '2-3',
    }),
  },
]
