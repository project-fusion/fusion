import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Time Picker, the times of a day in a list or on wheels. A record
 * says what a press on a time sends, what a refusal keeps, what a range sends as it
 * takes its ends, and that a barred time takes no press. Each offers the hours from
 * nine to eleven every half hour, so the list is short and today decides nothing.
 */

/** A list of the half hours from nine to eleven. */
const times = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-time-picker', {
    label: 'Starts',
    locale: 'en-US',
    max: '11:00',
    min: '09:00',
    step: 30,
    ...props,
  })

/** A press on a time, by the words a screen reader hears of it. */
const time = (label: string) => ({ kind: 'press' as const, label })

/** Time Picker: choosing, refusing, a range, and the times a rule bars. */
export const TIME_PICKER: readonly Scenario[] = [
  {
    family: 'time-picker',
    intents: [time('9:30 AM')],
    name: 'a press on a time asks before-change and chooses it',
    setup: times(),
  },
  {
    family: 'time-picker',
    intents: [{ event: 'before-change', kind: 'refuse' }, time('9:30 AM')],
    name: 'a refused change keeps the time',
    setup: times({ 'default-value': '10:00' }),
  },
  {
    family: 'time-picker',
    intents: [time('10:30 AM'), time('9:30 AM')],
    name: 'a range takes two ends in order',
    setup: times({ mode: 'range' }),
  },
  {
    family: 'time-picker',
    intents: [time('10:00 AM')],
    name: 'a barred time takes no press',
    setup: times({ 'disable-times': '10:00' }),
  },
]
