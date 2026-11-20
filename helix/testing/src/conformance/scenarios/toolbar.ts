import { el, type Scenario, type Setup } from '../format.js'

/** A button of the toolbar: its value, its words, and its props beside `value`. */
type Control = readonly [value: string, words: string, props?: Setup['props']]

/** A toolbar of buttons. */
const bar = (props: Setup['props'], controls: readonly Control[]): Setup =>
  el(
    'helix-toolbar',
    { label: 'Text formatting', ...props },
    controls.map(([value, words, own]) => el('helix-button', { value, ...own }, [words])),
  )

/** Three buttons a reader can reach. */
const THREE: readonly Control[] = [
  ['bold', 'Bold'],
  ['italic', 'Italic'],
  ['link', 'Link'],
]

/** Three buttons, the middle one disabled. */
const MIDDLE_OFF: readonly Control[] = [
  ['bold', 'Bold'],
  ['italic', 'Italic', { disabled: true }],
  ['link', 'Link'],
]

/** Three buttons, the middle one disabled and kept as a stop. */
const MIDDLE_KEPT: readonly Control[] = [
  ['bold', 'Bold'],
  ['italic', 'Italic', { disabled: true, 'focusable-when-disabled': true }],
  ['link', 'Link'],
]

/**
 * Toolbar: one stop whose arrow keys move focus among its controls, along
 * the way it runs, coming round from the last unless it stops at the ends.
 * The toolbar sends no event, so each step records where focus is.
 */
export const TOOLBAR: readonly Scenario[] = [
  {
    family: 'toolbar',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'the arrows move focus along a row, come round, and leave Up and Down alone',
    setup: bar({}, THREE),
  },
  {
    family: 'toolbar',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'a toolbar that stops at the ends keeps the arrows there',
    setup: bar({ 'stop-at-ends': true }, THREE),
  },
  {
    family: 'toolbar',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'a vertical toolbar moves with Down and Up and leaves Left and Right alone',
    setup: bar({ orientation: 'vertical' }, THREE),
  },
  {
    family: 'toolbar',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'the arrows pass over a disabled control',
    setup: bar({}, MIDDLE_OFF),
  },
  {
    family: 'toolbar',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'the arrows stop at a disabled control that keeps its focus',
    setup: bar({}, MIDDLE_KEPT),
  },
]
