import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Time Input, a time typed or picked from the list it opens. A
 * record says what a pick in the list sends and whether the panel closes, what a
 * refusal keeps, what a range sends as it takes its end, what typing and leaving
 * the text send, and what the clear sends. Each offers the half hours from nine to
 * eleven, so the list is short and the clock decides nothing.
 */

/** A field holding nine o'clock, its list the half hours from nine to eleven. */
const field = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-time-input', {
    'default-value': '09:00',
    label: 'Starts',
    locale: 'en-US',
    max: '11:00',
    min: '09:00',
    step: 30,
    ...props,
  })

/** A press on a time in the list, by the words a screen reader hears of it. */
const time = (label: string) => ({ kind: 'press' as const, label })

/** Time Input: picking, refusing, a range, typing, and the clear. */
export const TIME_INPUT: readonly Scenario[] = [
  {
    family: 'time-input',
    intents: [{ kind: 'open' }, time('9:30 AM')],
    name: 'a pick in the list asks before-change and closes the panel',
    setup: field(),
  },
  {
    family: 'time-input',
    intents: [{ event: 'before-change', kind: 'refuse' }, { kind: 'open' }, time('9:30 AM')],
    name: 'a refused pick keeps the time and the panel',
    setup: field(),
  },
  {
    family: 'time-input',
    intents: [{ kind: 'open' }, time('10:30 AM')],
    name: 'a range takes its end and stays open',
    setup: field({ mode: 'range' }),
  },
  {
    family: 'time-input',
    intents: [{ erase: 5, kind: 'type', text: '10:15' }, { kind: 'leave' }],
    name: 'typing asks before-change, and leaving says change',
    setup: field({ 'time-style': 'iso' }),
  },
  {
    family: 'time-input',
    intents: [{ kind: 'press', part: 'clear' }],
    name: 'the clear empties the field and says clear',
    setup: field({ clearable: true }),
  },
]
