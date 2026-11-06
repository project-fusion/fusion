import { el, type Scenario, type Setup } from '../format.js'

/*
 * Tag Group's scenarios. The group runs multiple selection with roving
 * focus and typeahead over its tags, and removes a tag through its
 * `dismiss`: Delete and Backspace send it from the focused tag, and a press
 * on the tag's remove button does.
 */

/** A tag: its value, its words, and its props beside `value`. */
type Item = readonly [value: string, words: string, props?: Setup['props']]

/** A tag group with these tags. */
const group = (props: Setup['props'], items: readonly Item[] = FOUR): Setup =>
  el(
    'helix-tag-group',
    { label: 'Filters', ...props },
    items.map(([value, words, own]) => el('helix-tag', { value, ...own }, [words])),
  )

/** Four filters, the last of them disabled. */
const FOUR: readonly Item[] = [
  ['open', 'Open'],
  ['mine', 'Mine'],
  ['late', 'Late'],
  ['old', 'Archived', { disabled: true }],
]

/** Three filters a reader can remove. */
const REMOVABLE: readonly Item[] = [
  ['open', 'Open', { dismissible: true }],
  ['mine', 'Mine', { dismissible: true }],
  ['late', 'Late', { dismissible: true }],
]

/** Tag groups: selecting, refusal, the keys, and removing a tag. */
export const TAG_GROUP: readonly Scenario[] = [
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'late', kind: 'press' },
      { item: 'old', kind: 'press' },
      { item: 'open', kind: 'press' },
    ],
    name: 'a press selects a tag and a second lets it go where several can be selected',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'late', kind: 'press' },
      { item: 'open', kind: 'press' },
      { item: 'mine', kind: 'press' },
      { item: 'open', kind: 'press' },
      { item: 'mine', kind: 'focus' },
      { held: { toggle: true }, key: 'a', kind: 'key' },
    ],
    name: 'a press writes the value in the order the tags were pressed, and Control with A in the order they stand',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'mine', kind: 'press' },
      { item: 'open', kind: 'press' },
      { item: 'late', kind: 'focus' },
      { held: { shift: true }, key: ' ', kind: 'key' },
    ],
    name: 'Shift with Space writes the range in the order the tags stand',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'open', kind: 'focus' },
      { held: { toggle: true }, key: 'Escape', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Escape with Control lets go of nothing, and Escape alone lets go',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'mine', kind: 'press' },
      { item: 'mine', kind: 'press' },
    ],
    name: 'a single group selects the tag pressed alone, and a second press lets it go',
    setup: group({ 'selection-mode': 'single' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'open', kind: 'press' },
    ],
    name: 'disallow-empty-selection keeps the last selected tag',
    setup: group({ 'disallow-empty-selection': true, 'selection-mode': 'single' }),
  },
  {
    family: 'tag-group',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'mine', kind: 'press' },
    ],
    name: 'a refused change keeps the selection',
    setup: group({ 'selection-mode': 'multiple', value: 'open' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'm', kind: 'key' },
    ],
    name: 'the arrows move focus, stop at the ends and pass over a disabled tag, and a letter finds a tag',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'focus' },
      { key: ' ', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { held: { toggle: true }, key: 'a', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Space and Enter select, Control with A selects every tag, and Escape lets go',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'mine', kind: 'press' },
      { item: 'mine', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'replace selects the tag pressed or moved to alone',
    setup: group({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { held: { shift: true }, key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Shift with an arrow selects the range from the tag focus left',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'late', kind: 'press' },
      { item: 'late', kind: 'focus' },
      { held: { shift: true }, key: 'ArrowLeft', kind: 'key' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift back toward the anchor lets go of the tags the range passed, and an arrow alone keeps the anchor',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'focus' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
    ],
    name: 'Control with Space selects nothing under toggle',
    setup: group({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'open', kind: 'press' },
      { item: 'mine', kind: 'focus' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
    ],
    name: 'Control with Space adds or takes out a tag under replace',
    setup: group({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'labels', kind: 'press' },
      { item: 'open', kind: 'press' },
    ],
    name: 'a press on a link tag opens it and selects nothing in a group that selects',
    setup: group({ 'selection-mode': 'multiple' }, [
      ['labels', 'Labels', { href: '/labels' }],
      ['open', 'Open'],
    ]),
  },
  {
    family: 'tag-group',
    intents: [
      { item: 'labels', kind: 'focus' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'Enter follows a tag’s link',
    setup: group({ 'selection-mode': 'multiple' }, [
      ['labels', 'Labels', { href: '/labels' }],
      ['open', 'Open'],
    ]),
  },
  {
    family: 'tag-group',
    intents: [
      { event: 'dismiss', kind: 'remove' },
      { item: 'mine', kind: 'focus' },
      { key: 'Delete', kind: 'key' },
      { key: 'Delete', kind: 'key' },
      { key: 'Backspace', kind: 'key' },
    ],
    name: 'Delete removes the focused tag, and focus moves on, back after the last, and to the group',
    setup: group({}, REMOVABLE),
  },
  {
    family: 'tag-group',
    intents: [
      { event: 'dismiss', kind: 'refuse' },
      { event: 'dismiss', kind: 'remove' },
      { item: 'mine', kind: 'press', part: 'dismiss' },
    ],
    name: 'a refused dismiss keeps the tag whose remove button was pressed',
    setup: group({}, REMOVABLE),
  },
  {
    family: 'tag-group',
    intents: [
      { event: 'dismiss', kind: 'remove' },
      { item: 'mine', kind: 'press', part: 'dismiss' },
      { item: 'open', kind: 'press' },
    ],
    name: 'a press on a tag’s remove button removes it, and selects nothing',
    setup: group({ 'selection-mode': 'multiple' }, REMOVABLE),
  },
  {
    family: 'tag-group',
    intents: [
      { event: 'dismiss', kind: 'remove' },
      { item: 'open', kind: 'focus' },
      { key: 'Delete', kind: 'key' },
    ],
    name: 'a selected tag that is removed leaves the value, which sends change',
    setup: group({ 'selection-mode': 'multiple', value: 'open,late' }, REMOVABLE),
  },
]
