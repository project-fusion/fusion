import { el, type Scenario, type Setup } from '../format.js'

/** A tab: its value, its words, and its props beside `value`. */
type Tab = readonly [value: string, words: string, props?: Setup['props']]

/** A tab set with these tabs, and a panel for each tab after them. */
const set = (props: Setup['props'], tabs: readonly Tab[]): Setup =>
  el('helix-tabs', props, [
    ...tabs.map(([value, words, own]) => el('helix-tab', { value, ...own }, [words])),
    ...tabs.map(([value]) => el('helix-tab-panel', { value }, [`Panel ${value}`], 'panels')),
  ])

/** Three tabs, the last of them disabled. */
const LAST_OFF: readonly Tab[] = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma', { disabled: true }],
]

/** Three tabs a reader can reach. */
const THREE: readonly Tab[] = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
]

/** Two tabs that are pages of a site. */
const LINKS: readonly Tab[] = [
  ['a', 'Alpha', { href: 'https://example.com/a' }],
  ['b', 'Beta', { href: 'https://example.com/b' }],
]

/** Tabs: choosing, the keys, refusal, links, disabled tabs, and a scrolled strip. */
export const TABS: readonly Scenario[] = [
  {
    family: 'tabs',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'b', kind: 'press' },
      { item: 'c', kind: 'press' },
      { item: 'a', kind: 'press' },
    ],
    name: 'a press chooses a tab, and passes over a disabled one',
    setup: set({}, LAST_OFF),
  },
  {
    family: 'tabs',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'the arrows choose where they arrive, come round, and pass over a disabled tab',
    setup: set({}, LAST_OFF),
  },
  {
    family: 'tabs',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: ' ', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'a manual set moves focus with the keys and chooses with Enter or Space',
    setup: set({ manual: true }, THREE),
  },
  {
    family: 'tabs',
    intents: [
      { event: 'before-activate', kind: 'refuse' },
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'a refused change keeps the tab that was chosen',
    setup: set({}, THREE),
  },
  {
    family: 'tabs',
    intents: [
      { event: 'before-select', kind: 'refuse' },
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: "a refused tab's choice keeps the tab that was chosen",
    setup: set({}, THREE),
  },
  {
    family: 'tabs',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'g', kind: 'key' },
      { key: 'b', kind: 'key' },
    ],
    name: 'a letter moves to the tab whose words start with it',
    setup: set({}, THREE),
  },
  {
    family: 'tabs',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'b', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'a tab that is a link opens it, and the arrows choose nothing',
    setup: set({ 'default-active': 'a' }, LINKS),
  },
  {
    family: 'tabs',
    intents: [
      { event: 'before-select', kind: 'refuse' },
      { item: 'b', kind: 'press' },
    ],
    name: "a refused tab's choice keeps its link closed",
    setup: set({ 'default-active': 'a' }, LINKS),
  },
  {
    family: 'tabs',
    intents: [
      { kind: 'scroll', x: 40, y: 0 },
      { item: 'b', kind: 'press' },
    ],
    name: 'a scrolled strip keeps its choice, and chooses after it',
    setup: set({ 'default-active': 'a', 'scroll-controls': true }, THREE),
  },
]
