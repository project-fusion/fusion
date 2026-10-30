import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Color Picker, a color built on a square and ramps. Both
 * halves move it with the keys, a press on the square, typed text, and a
 * preset, and the comparison holds the two records to each other: the events
 * each move sends, and the text of the color it holds.
 */

/** A picker named Brand, with its props. */
const brand = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-color-picker', { label: 'Brand', value: '#336699', ...props })

/** Color pickers: the keys, a press, typing, a refusal, and a picker that does not move. */
export const COLOR_PICKER: readonly Scenario[] = [
  {
    family: 'color-picker',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'each arrow moves the square a step and settles it',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [
      { kind: 'focus' },
      { key: 'PageUp', kind: 'key' },
      { key: 'PageDown', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'Page Up, Page Down, Home, and End move the square by ten',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowUp', kind: 'key' },
      { held: { shift: true }, key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Shift makes an arrow a step of ten',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'point', part: 'grid', x: 0.25, y: 0.5 }],
    name: 'a press takes the square to the point',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [
      { kind: 'point', part: 'grid', x: 1, y: 1 },
      { kind: 'point', part: 'grid', x: 1, y: 0 },
    ],
    name: 'the foot of the square keeps the hue for the way back up',
    setup: el('helix-color-picker', { label: 'Brand', value: '#ff0000' }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'point', part: 'wheel', x: 1, y: 0.5 }],
    name: 'a press on the ring takes the hue in that direction',
    setup: brand({ wheel: true }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'type', text: 'rgb(255 0 0)' }, { kind: 'leave' }],
    name: 'typed text in any syntax is the value as it was written',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'type', text: 'nope' }, { kind: 'leave' }],
    name: 'typed text that is no color stays out of the value, and is marked once the reader leaves',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { kind: 'point', part: 'grid', x: 0, y: 0 },
    ],
    name: 'a refused change leaves the color',
    setup: brand(),
  },
  {
    family: 'color-picker',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { kind: 'point', part: 'grid', x: 0, y: 0 },
    ],
    name: 'a read-only picker holds its color',
    setup: brand({ readonly: true }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'point', part: 'grid', x: 0, y: 0 }],
    name: 'a disabled picker holds its color',
    setup: brand({ disabled: true }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'focus' }, { key: 'ArrowUp', kind: 'key' }],
    name: 'a move writes the syntax format names',
    setup: brand({ format: 'rgb' }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'point', part: 'grid', x: 0.5, y: 0.5 }],
    name: 'a picker with alpha writes its opacity',
    setup: brand({ alpha: true, value: '#33669980' }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'press', part: 'swatch' }],
    name: 'a preset is written from its own numbers, and settles',
    setup: brand({ swatches: '#00aa00, #ff0000' }),
  },
  {
    family: 'color-picker',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'press', part: 'swatch' },
    ],
    name: 'a refused preset leaves the color',
    setup: brand({ swatches: '#00aa00, #ff0000' }),
  },
  {
    family: 'color-picker',
    intents: [{ kind: 'press', part: 'swatch' }],
    name: 'a read-only picker takes no preset',
    setup: brand({ readonly: true, swatches: '#00aa00, #ff0000' }),
  },
  {
    family: 'color-picker',
    intents: [{ erase: 2, kind: 'type', text: '200' }, { kind: 'leave' }],
    name: 'a number typed into a channel writes that channel',
    setup: brand({ 'channel-fields': true, 'no-value': true }),
  },
  {
    family: 'color-picker',
    intents: [{ erase: 7, kind: 'type' }, { kind: 'leave' }],
    name: 'a required picker emptied is marked',
    setup: brand({ required: true }),
  },
]
