import { el, type Held, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Tree, whose items stand inside each other. Each one names
 * an item by its value. The record says what a screen reader hears of every
 * row a reader can reach: its level, its place among its siblings, whether it
 * is expanded, and whether it is selected or checked.
 */

/** An item, with the items it holds in its `children` region. */
const item = (
  value: string,
  words: string,
  props: Readonly<Record<string, PropValue>> = {},
  children: readonly ReturnType<typeof el>[] = [],
  slot?: string,
) => el('helix-tree-item', { value, ...props }, [words, ...children], slot)

/** An item inside another. */
const leaf = (value: string, words: string, props: Readonly<Record<string, PropValue>> = {}) =>
  item(value, words, props, [], 'children')

/** Documents, open, holding Budget and Notes; Photos, shut, holding Beach; and Invoice. */
const tree = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-tree', { label: 'Files', ...props }, [
    item('documents', 'Documents', { 'default-open': true }, [
      leaf('budget', 'Budget'),
      leaf('notes', 'Notes'),
    ]),
    item('photos', 'Photos', {}, [leaf('beach', 'Beach')]),
    item('invoice', 'Invoice'),
  ])

/** The same, with a disabled item and a disabled branch. */
const out = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-tree', { label: 'Files', ...props }, [
    item('documents', 'Documents', { 'default-open': true }, [
      leaf('budget', 'Budget'),
      leaf('notes', 'Notes', { disabled: true }),
    ]),
    item('photos', 'Photos', { disabled: true }, [leaf('beach', 'Beach')]),
    item('invoice', 'Invoice'),
  ])

const press = (name: string) => ({ item: name, kind: 'press' as const })
const focus = (name: string) => ({ item: name, kind: 'focus' as const })
const key = (name: string, held?: Held) => ({
  key: name,
  kind: 'key' as const,
  ...(held ? { held } : {}),
})

/** Trees: choosing, opening, the keys, check marks that cascade, and moving items. */
export const TREE: readonly Scenario[] = [
  {
    family: 'tree',
    intents: [press('invoice'), press('budget')],
    name: 'a press on a leaf chooses it',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [press('photos'), press('photos')],
    name: 'a press on a branch chooses it and opens or closes it',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [{ event: 'before-activate', kind: 'refuse' }, press('invoice')],
    name: 'a refused change keeps what is chosen',
    setup: tree({ 'default-active': 'budget' }),
  },
  {
    family: 'tree',
    intents: [{ event: 'before-select', kind: 'refuse' }, press('invoice')],
    name: 'a refused choice changes nothing',
    setup: tree({ 'default-active': 'budget' }),
  },
  {
    family: 'tree',
    intents: [{ event: 'before-open', kind: 'refuse' }, press('photos')],
    name: 'a refused open keeps a branch shut, and it is still chosen',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [press('notes'), press('photos'), focus('photos'), key('ArrowRight'), key('Enter')],
    name: 'a press and a key on a disabled item do nothing',
    setup: out(),
  },
  {
    family: 'tree',
    intents: [
      focus('documents'),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowUp'),
      key('Home'),
      key('End'),
    ],
    name: 'Up and Down move between the items a reader can reach, and Home and End to the ends',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [
      /* A shut branch opens, and an open one is gone into, each from its own start:
         the harness's fake clock leaves a branch it just opened unfocusable until
         a frame runs, which a real key in Chromium does not meet. */
      focus('photos'),
      key('ArrowRight'),
      focus('documents'),
      key('ArrowRight'),
      key('ArrowRight'),
      key('ArrowLeft'),
      key('ArrowLeft'),
      key('ArrowLeft'),
    ],
    name: 'Right opens and goes in, and Left goes out and closes',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [focus('invoice'), key('Enter'), focus('photos'), key('Enter'), key(' ')],
    name: 'Enter and Space choose or open',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [focus('documents'), key('n'), key('i'), key('*')],
    name: 'a typed letter moves to the item it starts, and a star opens every branch beside',
    setup: tree(),
  },
  {
    family: 'tree',
    intents: [press('budget'), press('notes'), press('budget')],
    name: 'a press checks a leaf, and its branch reads mixed and then checked',
    setup: tree({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tree',
    intents: [
      { item: 'documents', kind: 'press', part: 'checkbox' },
      { item: 'documents', kind: 'press', part: 'checkbox' },
    ],
    name: 'a press on a branch check mark checks every item under it, and leaves it open',
    setup: tree({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tree',
    intents: [{ item: 'documents', kind: 'press', part: 'checkbox' }],
    name: 'a branch passes over a disabled item as it checks',
    setup: out({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tree',
    intents: [
      focus('documents'),
      key(' '),
      key('ArrowDown', { shift: true }),
      focus('invoice'),
      key(' ', { shift: true }),
      key('a', { toggle: true }),
      key('a', { toggle: true }),
    ],
    name: 'the keys of a tree of check marks check one, a range, and every item',
    setup: tree({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tree',
    intents: [press('photos'), press('beach')],
    name: 'under leaf a press on a branch opens it and chooses nothing',
    setup: tree({ 'selection-mode': 'leaf' }),
  },
  {
    family: 'tree',
    intents: [press('photos'), press('beach')],
    name: 'a branch that heads its list opens and is not chosen',
    setup: tree({ nesting: 'heading' }),
  },
  {
    family: 'tree',
    intents: [focus('invoice'), key('ArrowUp', { alt: true }), key('Home', { alt: true })],
    name: 'Alt with an arrow moves an item among its siblings',
    setup: tree({ reorderable: true }),
  },
  {
    family: 'tree',
    intents: [
      { event: 'before-reorder', kind: 'refuse' },
      focus('invoice'),
      key('ArrowUp', { alt: true }),
    ],
    name: 'a refused move sends no reorder',
    setup: tree({ reorderable: true }),
  },
  {
    family: 'tree',
    intents: [
      focus('invoice'),
      key('ArrowRight', { alt: true }),
      focus('notes'),
      key('ArrowLeft', { alt: true }),
    ],
    name: 'Alt with the arrow along the line moves an item into a branch and out of one',
    setup: tree({ reorderable: true }),
  },
]
