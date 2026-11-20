import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Sandbox, which a phone draws read only: its file tabs, the
 * one pane each shows, and a refused change. Each presses by a row, the tabs
 * in the order they stand. The record says which tab is chosen and what the
 * pane shown holds.
 */

/** A source pane of `name`, its tab's words `label`, holding `value`. */
const source = (name: string, label: string, value: string): Setup =>
  el('helix-sandbox-source', { label, name, value }, [], 'source')

const FILES = el('helix-sandbox', {}, [
  source('html', 'index.html', '<p class="lead">Hello</p>'),
  source('css', 'styles.css', '.lead { font-weight: 600 }'),
  source('js', 'main.js', "console.log('Rendered')"),
])

const press = (row: number) => ({ kind: 'press' as const, row })
/** A press past the last row, which changes nothing and reads what stands. */
const READ = { kind: 'press' as const, row: 99 }
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** A sandbox's files: tabs over the source panes, one shown at a time. */
export const SANDBOX: readonly Scenario[] = [
  {
    family: 'sandbox',
    intents: [READ],
    name: 'several source panes are files under tabs, the first shown',
    setup: FILES,
  },
  {
    family: 'sandbox',
    intents: [press(1), press(2)],
    name: 'a press on a tab shows its pane and says which',
    setup: FILES,
  },
  {
    family: 'sandbox',
    intents: [press(0)],
    name: 'a press on the tab already chosen says nothing',
    setup: FILES,
  },
  {
    family: 'sandbox',
    intents: [refuse('before-change'), press(1)],
    name: 'a refused change keeps the pane shown',
    setup: FILES,
  },
  {
    family: 'sandbox',
    intents: [READ],
    name: 'file shows the pane it names',
    setup: el('helix-sandbox', { file: 'css' }, [
      source('html', 'index.html', 'one'),
      source('css', 'styles.css', 'two'),
    ]),
  },
]
