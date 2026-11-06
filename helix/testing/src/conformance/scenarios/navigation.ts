import { el, type Scenario, type Setup } from '../format.js'

/** A destination: its `href`, which it is known by, its words, and its props beside `href`. */
type Destination = readonly [href: string, words: string, props?: Setup['props']]

/** A navigation with these destinations. */
const bar = (props: Setup['props'], items: readonly Destination[]): Setup =>
  el(
    'helix-navigation',
    { label: 'Sections', ...props },
    items.map(([href, words, own]) => el('helix-navigation-item', { href, ...own }, [words])),
  )

/** Three destinations, the first of them the current page. */
const THREE: readonly Destination[] = [
  ['/one', 'Overview', { current: 'page' }],
  ['/two', 'Activity'],
  ['/three', 'Settings'],
]

/** Navigation: links, refusal, the arrow keys along each way, and the page moving the current item. */
export const NAVIGATION: readonly Scenario[] = [
  {
    family: 'navigation',
    intents: [
      { item: '/two', kind: 'press' },
      { item: '/three', kind: 'press' },
      { item: '/one', kind: 'press' },
    ],
    name: 'a press on a destination sends its select and follows its link, and moves no mark',
    setup: bar({}, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { event: 'select', kind: 'refuse' },
      { item: '/two', kind: 'press' },
    ],
    name: 'a refused select keeps the link closed',
    setup: bar({}, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { item: '/two', kind: 'focus' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'Enter on a destination follows its link',
    setup: bar({}, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { item: '/one', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'under arrows, the arrows along the row move focus and stop at the ends, choosing nothing',
    setup: bar({ arrows: true }, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { item: '/one', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'down a column under arrows, Down and Up move focus, and Left and Right do not',
    setup: bar({ arrows: true, orientation: 'vertical' }, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { item: '/one', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'without arrows, the arrow keys move nothing',
    setup: bar({}, THREE),
  },
  {
    family: 'navigation',
    intents: [
      { item: '/three', kind: 'set', prop: 'current', value: 'page' },
      { item: '/one', kind: 'set', prop: 'current', value: false },
      { item: '/two', kind: 'set', prop: 'current', value: 'location' },
    ],
    name: 'the page moves the current destination',
    setup: bar({}, THREE),
  },
]
