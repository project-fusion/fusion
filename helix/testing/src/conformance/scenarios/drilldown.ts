import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Drilldown, a stack of pages of rows: a row with a page
 * goes into it, Escape and the arrow back come out, each move asks
 * `navigate` first, and a row with no page sends `select`. A record says
 * which rows are drawn on the page showing and where focus is.
 */

/** Settings: Appearance, which holds Theme and Density; Editor, a link; and About. */
const settings = (props: Setup['props'] = {}): Setup =>
  el('helix-drilldown', { label: 'Settings', ...props }, [
    el('helix-drilldown-item', { value: 'appearance' }, [
      'Appearance',
      el('helix-drilldown-item', { value: 'theme' }, ['Theme'], 'page'),
      el('helix-drilldown-item', { value: 'density' }, ['Density'], 'page'),
    ]),
    el('helix-drilldown-item', { href: '#editor', value: 'editor' }, ['Editor']),
    el('helix-drilldown-item', { value: 'about' }, ['About']),
  ])

/** Drilldowns: going in and back, refusing a move, the keys, a row that is chosen, the page prop, and navigation. */
export const DRILLDOWN: readonly Scenario[] = [
  {
    family: 'drilldown',
    intents: [
      { item: 'appearance', kind: 'press' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'a row with a page goes into it, and Escape comes back to it',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { event: 'navigate', kind: 'refuse' },
      { item: 'appearance', kind: 'press' },
    ],
    name: 'a refused move keeps the page showing',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { item: 'appearance', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'the arrow along the line goes in, and the arrow back comes out',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { item: 'about', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'the arrow keys move among the rows of the page',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { item: 'about', kind: 'press' },
      { item: 'editor', kind: 'press' },
      { event: 'select', kind: 'refuse' },
      { item: 'editor', kind: 'press' },
    ],
    name: 'a row with no page sends select, and a link opens once it stands',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { kind: 'set', prop: 'page', value: 'appearance' },
      { kind: 'set', prop: 'page', value: '' },
    ],
    name: 'writing the page shows it',
    setup: settings(),
  },
  {
    family: 'drilldown',
    intents: [
      { item: 'appearance', kind: 'press' },
      { key: 'Escape', kind: 'key' },
      { item: 'about', kind: 'press' },
    ],
    name: 'under navigation, a row goes into its page and back, and a row with none is chosen',
    setup: settings({ navigation: true }),
  },
]
