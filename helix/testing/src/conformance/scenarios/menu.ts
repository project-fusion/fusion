import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Menu, a panel of rows its trigger opens, one page at a
 * time. The page opens it by writing `open`, with focus on a control of the
 * page first, so a record says where focus goes as a row is chosen, as a
 * page is drilled into and left, and as the menu closes.
 */

/** A menu of a command, a page of a run of choices, a choice, and a section. */
const menu = (props: Setup['props'] = {}): Setup =>
  el('helix-menu', { label: 'View options', ...props }, [
    el('helix-button', {}, ['Options'], 'trigger'),
    el('helix-menu-item', { value: 'rename' }, ['Rename']),
    el('helix-menu-item', { value: 'sort' }, [
      'Sort by',
      el('helix-menu-item', { checked: true, exclusive: true, value: 'name' }, ['Name'], 'submenu'),
      el('helix-menu-item', { exclusive: true, value: 'date' }, ['Date'], 'submenu'),
    ]),
    el('helix-menu-item', { checkable: true, value: 'hidden' }, ['Show hidden files']),
    el('helix-menu-section', { label: 'Danger' }, [
      el('helix-menu-item', { value: 'delete' }, ['Delete']),
    ]),
  ])

/** Menus: choosing, refusing, choices that turn, pages, the keys, and the ways it closes. */
export const MENU: readonly Scenario[] = [
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'rename', kind: 'press' },
    ],
    name: 'choosing a row sends select and closes the menu',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { event: 'select', kind: 'refuse' },
      { item: 'rename', kind: 'press' },
    ],
    name: 'a refused choice keeps the menu open',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { item: 'hidden', kind: 'press' },
      { kind: 'set', prop: 'open', value: false },
      { kind: 'set', prop: 'open', value: true },
      { item: 'hidden', kind: 'press' },
    ],
    name: 'a choice turns over before its select, and back once the menu opens again',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-toggle', kind: 'refuse' },
      { item: 'hidden', kind: 'press' },
    ],
    name: 'a refused turn keeps the choice as it was',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'sort', kind: 'press' },
      { item: 'date', kind: 'press' },
    ],
    name: 'a row with a page goes into it, and a choice of a run turns the rest off',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'sort', kind: 'press' },
      { key: 'Escape', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Escape on a page comes back to its row, and on the top page closes the menu',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { item: 'rename', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'the arrow keys move among the rows, through a section, and in and out of a page',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'hidden', kind: 'focus' },
      { key: ' ', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'Space on a choice turns it and keeps the menu open, and Enter turns it and closes it',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press outside closes it',
    setup: menu(),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press beside a sheet closes it',
    setup: menu({ presentation: 'sheet' }),
  },
  {
    family: 'menu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-close', kind: 'refuse' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a refused close keeps it open',
    setup: menu(),
  },
]
