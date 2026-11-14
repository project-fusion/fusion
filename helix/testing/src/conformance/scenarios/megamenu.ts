import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Megamenu, a trigger that discloses a panel of
 * destinations. A press opens it, under `open-on="click"` where the web's
 * mouse would rest, so a record says what a press does on both platforms,
 * and where focus stands as it opens and closes.
 */

/** A megamenu of two groups, its trigger the button it draws, named Products. */
const megamenu = (props: Setup['props'] = {}): Setup =>
  el('helix-megamenu', { label: 'Products', 'open-on': 'click', ...props }, [
    el('helix-megamenu-group', { label: 'Work' }, [
      el('helix-megamenu-item', { href: '#projects' }, ['Projects']),
      el('helix-megamenu-item', { href: '#documents' }, ['Documents']),
    ]),
    el('helix-megamenu-group', { label: 'Insights' }, [
      el('helix-megamenu-item', { href: '#reports' }, ['Reports']),
    ]),
  ])

/** Megamenus: a press, a destination, refusals, the ways out, and where focus goes. */
export const MEGAMENU: readonly Scenario[] = [
  {
    family: 'megamenu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'open' },
      { item: '#documents', kind: 'press' },
    ],
    name: 'a press opens it, leaving focus where it was, and a destination closes it once its link is followed',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [
      { kind: 'open' },
      { event: 'before-select', kind: 'refuse' },
      { item: '#documents', kind: 'press' },
    ],
    name: 'a refused before-select keeps the link closed and the panel open',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [{ kind: 'open' }, { kind: 'close' }],
    name: 'a press on the open trigger closes it',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [{ event: 'before-open', kind: 'refuse' }, { kind: 'open' }],
    name: 'a refused open keeps it closed',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [
      { kind: 'open' },
      { item: '#projects', kind: 'focus' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Escape among its destinations closes it, with focus back on the trigger',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [{ kind: 'focus', page: true }, { kind: 'open' }, { by: 'outside', kind: 'dismiss' }],
    name: 'a press outside closes it, with focus on the trigger',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'open' },
      { event: 'before-close', kind: 'refuse' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a refused close keeps it open',
    setup: megamenu(),
  },
  {
    family: 'megamenu',
    intents: [{ kind: 'open' }, { kind: 'close' }],
    name: 'under open-on="hover", a press opens it and closes it',
    setup: megamenu({ 'open-on': 'hover' }),
  },
  {
    family: 'megamenu',
    intents: [
      { kind: 'open' },
      { item: '#reports', kind: 'set', prop: 'current', value: 'page' },
      { item: '#reports', kind: 'set', prop: 'current', value: false },
    ],
    name: 'the page moves the current destination in an open panel',
    setup: megamenu(),
  },
]
