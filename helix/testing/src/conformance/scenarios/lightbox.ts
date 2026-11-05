import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Lightbox, a modal viewer that shows one item at a time.
 * The record says each move it asks and makes, by the items' values, and
 * whether it stands open. The zoom and the swipe are read from laid-out
 * lengths and a pinch's fingers, so a jest spec of the phone holds those.
 */

/** A lightbox open over the page, with three items and its own controls. */
const lightbox = (props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-lightbox', { controls: true, label: 'Photos', open: true, ...props }, [
    el('helix-lightbox-item', { label: 'Sea', value: 'sea' }, ['The sea']),
    el('helix-lightbox-item', { label: 'Sun', value: 'sun' }, ['The sun']),
    el('helix-lightbox-item', { label: 'Sand', value: 'sand' }, ['The sand']),
  ])

const press = (part: string) => ({ kind: 'press' as const, part })
const key = (name: string) => ({ key: name, kind: 'key' as const })

/** Lightboxes: its controls at the ends, its keys and a close request, and a refusal. */
export const LIGHTBOX: readonly Scenario[] = [
  {
    family: 'lightbox',
    intents: [press('next'), press('next'), press('next'), press('previous')],
    name: 'the controls step through the items and stop at the last',
    setup: lightbox(),
  },
  {
    family: 'lightbox',
    intents: [press('previous'), press('previous')],
    name: 'under loop previous goes round from the first',
    setup: lightbox({ loop: true }),
  },
  {
    family: 'lightbox',
    intents: [key('ArrowRight'), key('End'), key('Home'), key('ArrowDown'), key('ArrowUp')],
    name: 'the keys step and go to the ends',
    setup: lightbox(),
  },
  {
    family: 'lightbox',
    intents: [{ event: 'before-activate', kind: 'refuse' }, press('next'), key('End')],
    name: 'a refused move leaves the item shown',
    setup: lightbox(),
  },
  {
    family: 'lightbox',
    intents: [{ by: 'escape', kind: 'dismiss' }],
    name: 'a close request closes it',
    setup: lightbox(),
  },
]
