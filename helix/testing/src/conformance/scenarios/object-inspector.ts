import { el, type Held, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Object Inspector, whose value arrives as data. Each one names
 * a row by its place among the rows drawn. The record says what a screen reader
 * hears of each row, what the row reads, which rows a filter matched, which row
 * is active, and which holds focus.
 */

const VALUE = {
  count: 3,
  id: 'dpl_8f2c',
  meta: { author: 'Ada', tags: ['main', 'edge'] },
  none: null,
  ok: true,
}

/** An inspector of `VALUE`, whose rows at rest are the root, count, id, meta, none, and ok. */
const inspector = (props: Readonly<Record<string, PropValue>> = {}): Setup => ({
  ...el('helix-object-inspector', { label: 'Deployment', ...props }),
  value: VALUE,
})

const press = (row: number) => ({ kind: 'press' as const, row })
const focus = (row: number) => ({ kind: 'focus' as const, row })
const key = (name: string, held?: Held) => ({
  key: name,
  kind: 'key' as const,
  ...(held ? { held } : {}),
})
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Object inspectors: moving between rows, opening branches, filtering, and copying a row. */
export const OBJECT_INSPECTOR: readonly Scenario[] = [
  {
    family: 'object-inspector',
    intents: [focus(0)],
    name: 'the rows of one open level, with each kind of value',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(0)],
    name: 'the rows of every level, under a large default depth',
    setup: inspector({ 'default-depth': 9 }),
  },
  {
    family: 'object-inspector',
    intents: [focus(0)],
    name: 'one closed row, under a default depth of zero',
    setup: inspector({ 'default-depth': 0 }),
  },
  {
    family: 'object-inspector',
    intents: [
      focus(0),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowUp'),
      key('End'),
      key('Home'),
    ],
    name: 'the keys that move between rows',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [
      focus(3),
      key('ArrowRight'),
      key('ArrowRight'),
      key('ArrowLeft'),
      key('ArrowLeft'),
      key('ArrowLeft'),
    ],
    name: 'Right opens and moves in, and Left closes and moves out',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(3), key('Enter'), key(' '), key('Enter')],
    name: 'Enter and Space open and close a branch',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(1), key('Enter')],
    name: 'Enter on a leaf does nothing',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(3), key('*')],
    name: 'a star opens the branches beside the row',
    setup: inspector({ 'default-depth': 1 }),
  },
  {
    family: 'object-inspector',
    intents: [focus(0), key('m'), key('o')],
    name: 'a typed letter goes to the next key it starts',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [press(3), press(1), press(0)],
    name: 'a press makes a row active, and opens or closes a branch',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [refuse('before-open'), focus(3), key('Enter'), press(3)],
    name: 'a refused before-open keeps a branch closed',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [refuse('before-close'), focus(0), key('Enter')],
    name: 'a refused before-close keeps a branch open',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [refuse('before-activate'), focus(0), key('ArrowDown'), press(2)],
    name: 'a refused before-activate keeps the active row',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [{ kind: 'type', text: 'ada' }, key('ArrowDown'), { erase: 3, kind: 'type' }],
    name: 'typing in the field narrows the rows, and Down moves to them',
    setup: inspector({ filterable: true }),
  },
  {
    family: 'object-inspector',
    intents: [{ kind: 'type', text: 'zzz' }],
    name: 'a filter that matches nothing says so',
    setup: inspector({ filterable: true }),
  },
  {
    family: 'object-inspector',
    intents: [refuse('before-filter'), { kind: 'type', text: 'a' }],
    name: 'a refused before-filter keeps the rows',
    setup: inspector({ filterable: true }),
  },
  {
    family: 'object-inspector',
    intents: [focus(0)],
    name: 'a filter set by the page narrows the rows from the start',
    setup: inspector({ filter: 'edge', filterable: true }),
  },
  {
    family: 'object-inspector',
    intents: [{ kind: 'set', prop: 'active', value: '/meta/tags/1' }, focus(0)],
    name: 'a written active row opens the branches around it',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(0), key('c', { toggle: true })],
    name: 'Control or Command with C copies the active row',
    setup: inspector(),
  },
  {
    family: 'object-inspector',
    intents: [focus(0), key('ArrowDown'), key('End'), key('Home')],
    name: 'a windowed tree moves between its rows',
    setup: inspector({ windowed: true }),
  },
  {
    family: 'object-inspector',
    intents: [{ kind: 'set', prop: 'label', value: 'Still nothing' }],
    name: 'no value draws the empty row',
    setup: el('helix-object-inspector', { label: 'Nothing yet' }),
  },
]
