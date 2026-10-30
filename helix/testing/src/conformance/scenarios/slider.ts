import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Slider, a value moved along a track. Both halves move it
 * with the keys, a screen reader's steps, and a drag that lets go at a
 * point of the track, and the comparison holds the two records to each
 * other: the events each move sends, and the value the slider holds.
 */

/** A slider labeled Volume, with its props. */
const volume = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-slider', { label: 'Volume', ...props })

/** Sliders: the keys, the ends, a step, the bounds, a drag, a refusal, and a slider that does not move. */
export const SLIDER: readonly Scenario[] = [
  {
    family: 'slider',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'a range moves its first thumb with the keys, and the value holds each thumb',
    setup: volume({ 'default-value': '20,70', range: true }),
  },
  {
    family: 'slider',
    intents: [{ kind: 'focus' }, { key: 'End', kind: 'key' }],
    name: 'a thumb stops at its neighbor, min-steps-between-thumbs steps away',
    setup: volume({ 'default-value': '20,70', 'min-steps-between-thumbs': 10, range: true }),
  },
  {
    family: 'slider',
    intents: [
      { by: 1, kind: 'adjust' },
      { by: -1, kind: 'adjust' },
    ],
    name: 'a screen reader steps a range first thumb',
    setup: volume({ 'default-value': '20,50,80', range: true }),
  },
  {
    family: 'slider',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'a refused move leaves a range where it stands',
    setup: volume({ 'default-value': '20,70', range: true }),
  },
  {
    disabledFieldset: true,
    family: 'slider',
    intents: [{ kind: 'slide', to: 0.75 }],
    name: 'a disabled fieldset around a slider holds it still',
    setup: volume({ 'default-value': '40' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'each arrow moves the value a step and commits it',
    setup: volume({ 'default-value': '40' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Home and End take the value to its ends, and nothing moves it past them',
    setup: volume({ 'default-value': '40' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'PageUp', kind: 'key' },
      { key: 'PageDown', kind: 'key' },
    ],
    name: 'a step and a page move the value by their size, held to the step',
    setup: volume({ 'default-value': '50', max: 200, step: 5 }),
  },
  {
    family: 'slider',
    intents: [{ kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'a value written past its end or off its step is held to them',
    setup: volume({ max: 50, min: 10, step: 10, value: '57' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'slide', to: 0.75 },
      { kind: 'slide', to: 0.75 },
      { kind: 'slide', to: 0.2 },
    ],
    name: 'a drag that lets go somewhere new sends input and change',
    setup: volume({ 'default-value': '40' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'slide', to: 0.61 },
      { kind: 'slide', to: 1 },
    ],
    name: 'a drag lands on a step',
    setup: volume({ 'default-value': '0', step: 25 }),
  },
  {
    family: 'slider',
    intents: [
      { by: 1, kind: 'adjust' },
      { by: 1, kind: 'adjust' },
      { by: -1, kind: 'adjust' },
    ],
    name: 'a screen reader steps the value up and down',
    setup: volume({ 'default-value': '90', step: 10 }),
  },
  {
    family: 'slider',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'slide', to: 0.8 },
      { by: 1, kind: 'adjust' },
    ],
    name: 'a refused move leaves the value where it was',
    setup: volume({ 'default-value': '40' }),
  },
  {
    family: 'slider',
    intents: [
      { kind: 'slide', to: 0.8 },
      { by: 1, kind: 'adjust' },
    ],
    name: 'a disabled slider takes no move',
    setup: volume({ 'default-value': '40', disabled: true }),
  },
  {
    family: 'slider',
    intents: [{ kind: 'slide', to: 0.8 }, { kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'a read-only slider takes no move and keeps its focus',
    setup: volume({ 'default-value': '40', readonly: true }),
  },
  {
    family: 'slider',
    intents: [{ kind: 'focus' }, { key: 'ArrowUp', kind: 'key' }, { kind: 'slide', to: 0.25 }],
    name: 'a vertical slider moves the same way',
    setup: volume({ 'default-value': '40', orientation: 'vertical' }),
  },
]
