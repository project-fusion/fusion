import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Date Input, a date typed or picked from the calendar it opens. A
 * record says what a pick in the calendar sends and whether the panel closes, what a
 * refusal keeps, what typing and leaving the text send, and what the clear sends.
 * Each holds a date in August 2026, so the calendar opens there and today never
 * decides what is drawn.
 */

/** A field holding a date in August 2026. */
const field = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-date-input', {
    'default-value': '2026-08-04',
    label: 'Starts',
    locale: 'en-US',
    ...props,
  })

/** A press on a day of the calendar, by the words a screen reader hears of it. */
const day = (label: string) => ({ kind: 'press' as const, label })

/** Date Input: picking, refusing, a range, typing, and the clear. */
export const DATE_INPUT: readonly Scenario[] = [
  {
    family: 'date-input',
    intents: [{ kind: 'open' }, day('Tuesday, August 11, 2026')],
    name: 'a pick in the calendar asks before-change and closes the panel',
    setup: field(),
  },
  {
    family: 'date-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'open' },
      day('Tuesday, August 11, 2026'),
    ],
    name: 'a refused pick keeps the date and the panel',
    setup: field(),
  },
  {
    family: 'date-input',
    intents: [{ kind: 'open' }, day('Tuesday, August 11, 2026')],
    name: 'a range takes its end and stays open',
    setup: field({ mode: 'range' }),
  },
  {
    family: 'date-input',
    intents: [{ erase: 10, kind: 'type', text: '2026-08-20' }, { kind: 'leave' }],
    name: 'typing asks before-change, and leaving says change',
    setup: field({ 'date-style': 'iso' }),
  },
  {
    family: 'date-input',
    intents: [{ kind: 'press', part: 'clear' }],
    name: 'the clear empties the field and says clear',
    setup: field({ clearable: true }),
  },
]
