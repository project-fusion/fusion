import { el, type Held, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Listbox and Option. An item is an option by its value. The
 * record says what a screen reader hears of each option a reader can reach, which
 * are chosen, and the events a press and a key send.
 */

type Props = Readonly<Record<string, PropValue>>

const option = (value: string, words: string, props: Props = {}) =>
  el('helix-option', { value, ...props }, [words])

/** Four kinds of fruit, the third disabled. */
const list = (props: Props = {}) =>
  el('helix-listbox', { label: 'Fruit', ...props }, [
    option('apple', 'Apple'),
    option('banana', 'Banana'),
    option('cherry', 'Cherry', { disabled: true }),
    option('date', 'Date'),
  ])

const press = (item: string) => ({ item, kind: 'press' as const })
const key = (name: string, held?: Held) => ({
  key: name,
  kind: 'key' as const,
  ...(held ? { held } : {}),
})
const stop = { kind: 'focus' as const }
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Lists: a press, a refusal, many chosen, a Shift range, the keys, and a filter. */
export const LISTBOX: readonly Scenario[] = [
  {
    family: 'listbox',
    intents: [press('banana')],
    name: 'a press chooses the option, and says so',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [refuse('before-change'), press('banana')],
    name: 'a refused choice leaves the value',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [press('cherry')],
    name: 'a press on a disabled option chooses nothing',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [press('apple'), press('banana'), press('apple')],
    name: 'under multiple a press toggles',
    setup: list({ multiple: true }),
  },
  {
    family: 'listbox',
    intents: [{ kind: 'set', prop: 'value', value: 'date' }],
    name: 'a written value selects its option',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [press('apple'), stop, key('End'), key('ArrowUp')],
    name: 'the keys move and choose in a list of one',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [press('apple'), stop, key('ArrowDown'), key('ArrowDown'), key(' ', { shift: true })],
    name: 'Shift with Space adds the range, skipping what is disabled',
    setup: list({ manual: true, multiple: true }),
  },
  {
    family: 'listbox',
    intents: [press('banana'), stop, key('Home', { shift: true })],
    name: 'Shift with Home adds every option back to the first',
    setup: list({ multiple: true }),
  },
  {
    family: 'listbox',
    intents: [press('banana'), stop, key('a', { toggle: true }), key('a', { toggle: true })],
    name: 'Control with A chooses every option, then none',
    setup: list({ multiple: true }),
  },
  {
    family: 'listbox',
    intents: [press('apple'), stop, key('d')],
    name: 'a typed letter moves to an option it starts',
    setup: list(),
  },
  {
    family: 'listbox',
    intents: [{ kind: 'set', prop: 'filter', value: 'an' }],
    name: 'a filter leaves what matches',
    setup: list({ filterable: true }),
  },
  {
    family: 'listbox',
    intents: [{ kind: 'set', prop: 'filter', value: 'zzz' }],
    name: 'a filter that leaves nothing says the empty words',
    setup: list({ 'empty-text': 'Nothing', filterable: true }),
  },
]
