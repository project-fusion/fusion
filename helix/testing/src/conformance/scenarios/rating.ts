import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Rating, a score picked from a row of marks. Both halves
 * press the row at a point along it, as a finger taps a star, and pick with
 * the keys, and the comparison holds the two records to each other: the
 * score shown as the finger is down, the events each choice sends, the
 * score the rating holds, and whether it is marked wrong.
 */

/** A rating labeled Quality, with its props. */
const quality = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-rating', { label: 'Quality', ...props })

/** Ratings: presses, halves, the keys, the ends, clearing, a refusal, a floor, and ratings that take no choice. */
export const RATING: readonly Scenario[] = [
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.5 },
      { kind: 'slide', to: 0.9 },
      { kind: 'slide', to: 0.3 },
    ],
    name: 'a press picks the score under it, and shows it while the finger is down',
    setup: quality(),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.45 },
      { kind: 'slide', to: 0.75 },
    ],
    name: 'a press on a row of halves picks a half step',
    setup: quality({ step: 0.5 }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'each arrow picks the next score or the one before, and stops at the last',
    setup: quality({ 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Home and End pick the first and the last score, and nothing moves past the first',
    setup: quality({ 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [{ kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'an arrow steps from the first score while none is chosen',
    setup: quality(),
  },
  {
    family: 'rating',
    intents: [{ kind: 'focus' }, { key: ' ', kind: 'key' }],
    name: 'Space picks the score focus stands on',
    setup: quality(),
  },
  {
    family: 'rating',
    intents: [{ kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'a score between the steps stands on the nearest, which the keys move from',
    setup: quality({ 'default-value': '3.4' }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.5 },
      { kind: 'slide', to: 0.7 },
    ],
    name: 'a clearable rating takes a press on its score back to none',
    setup: quality({ clearable: true, 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [{ kind: 'focus' }, { key: 'Backspace', kind: 'key' }, { key: 'Delete', kind: 'key' }],
    name: 'Backspace takes a clearable rating back to none',
    setup: quality({ clearable: true, 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [{ kind: 'slide', to: 0.5 }, { kind: 'focus' }, { key: 'Backspace', kind: 'key' }],
    name: 'a press on the score chosen and Backspace do nothing where it is not clearable',
    setup: quality({ 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'slide', to: 0.9 },
      { kind: 'focus' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'a refused choice leaves the score where it was',
    setup: quality({ 'default-value': '3' }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.1 },
      { kind: 'focus' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'min leaves the scores below it out',
    setup: quality({ min: 2 }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'set', prop: 'value', value: '4' },
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'a score the page writes sends nothing, and the keys go on from it',
    setup: quality({ 'default-value': '2' }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.9 },
      { by: 1, kind: 'adjust' },
    ],
    name: 'a read-only rating takes no choice',
    setup: quality({ 'default-value': '4', readonly: true }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.9 },
      { by: 1, kind: 'adjust' },
    ],
    name: 'a disabled rating takes no choice',
    setup: quality({ 'default-value': '3', disabled: true }),
  },
  {
    family: 'rating',
    intents: [
      { kind: 'slide', to: 0.5 },
      { kind: 'slide', to: 0.5 },
    ],
    name: 'a required rating is marked wrong once its score is taken back to none',
    setup: quality({ clearable: true, required: true }),
  },
]
