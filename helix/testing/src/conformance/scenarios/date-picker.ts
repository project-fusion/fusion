import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Date Picker, a month calendar. A record says what a press on a
 * day sends as the mode allows, what a refusal keeps, what paging the months
 * sends, and that a day the rules bar takes no press. Each opens on August 2026,
 * so today never decides what is drawn.
 */

/** A calendar on August 2026. */
const calendar = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-date-picker', { 'default-month': '2026-08', locale: 'en-US', ...props })

/** A press on a day or a control, by the words a screen reader hears of it. */
const day = (label: string) => ({ kind: 'press' as const, label })
const press = day

/** Date Picker: choosing, refusing, a range, several dates, paging, and the bounds. */
export const DATE_PICKER: readonly Scenario[] = [
  {
    family: 'date-picker',
    intents: [day('Tuesday, August 4, 2026')],
    name: 'a press on a day asks before-change and chooses it',
    setup: calendar(),
  },
  {
    family: 'date-picker',
    intents: [{ event: 'before-change', kind: 'refuse' }, day('Tuesday, August 4, 2026')],
    name: 'a refused change keeps the dates',
    setup: calendar({ 'default-value': '2026-08-10' }),
  },
  {
    family: 'date-picker',
    intents: [day('Monday, August 10, 2026'), day('Tuesday, August 4, 2026')],
    name: 'a range takes two ends in order',
    setup: calendar({ mode: 'range' }),
  },
  {
    family: 'date-picker',
    intents: [day('Monday, August 10, 2026'), day('Monday, August 10, 2026')],
    name: 'several dates toggle',
    setup: calendar({ mode: 'multiple' }),
  },
  {
    family: 'date-picker',
    intents: [press('Next month'), press('Previous month')],
    name: 'the controls ask before-navigate and page the months',
    setup: calendar(),
  },
  {
    family: 'date-picker',
    intents: [{ event: 'before-navigate', kind: 'refuse' }, press('Next month')],
    name: 'a refused move keeps the month',
    setup: calendar(),
  },
  {
    family: 'date-picker',
    intents: [press('Previous month'), day('Saturday, August 8, 2026')],
    name: 'the bounds stop paging and the rules bar a day',
    setup: calendar({ 'disable-days': '0,6', min: '2026-08-03' }),
  },
]
