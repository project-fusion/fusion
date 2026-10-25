import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Drawer, a layer along an edge of the window, modal unless
 * `modal` is false. The page opens it by writing `open`, with focus on a
 * control of the page first, so a record says where focus goes as the drawer
 * opens and where it comes back.
 */

/** A drawer of filters, with one action, which a record names by its value where focus is on it. */
const drawer = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-drawer', { label: 'Filters', ...props }, [
    'Show archived files.',
    el('helix-button', { value: 'apply' }, ['Apply']),
  ])

/** Drawers: a close request, a press outside, one that is not modal, and one that is persistent. */
export const DRAWER: readonly Scenario[] = [
  {
    family: 'drawer',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes it and puts focus back on the page',
    setup: drawer(),
  },
  {
    family: 'drawer',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press outside a modal drawer closes it',
    setup: drawer(),
  },
  {
    family: 'drawer',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
      { by: 'back', kind: 'dismiss' },
    ],
    name: 'a drawer that is not modal keeps a press outside and closes on a close request',
    /* The attribute's words, as markup turns a drawer's modal off. */
    setup: drawer({ modal: 'false' }),
  },
  {
    family: 'drawer',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'reader', kind: 'dismiss' },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a persistent drawer keeps a close request and a press outside',
    setup: drawer({ persistent: true }),
  },
]
