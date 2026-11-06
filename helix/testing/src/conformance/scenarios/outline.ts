import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Outline, which marks the link of the section being read
 * as the page scrolls and sends `activate` with its id, and scrolls to a
 * section when its link is pressed.
 *
 * **One setup draws sections both platforms find**: Outline Sections, which
 * the web finds as anchors by their ids and a phone registers by ref, in a
 * scroll area both halves lay out alike (`SECTION_LAYOUT`). The outline
 * stands after them, so its own length moves no section.
 */

/** Three sections in a scroll area, and an outline that links to each. */
const page = el('helix-scroll-area', { label: 'Guide' }, [
  el('helix-outline-section', { anchor: 'install', label: 'Install' }, ['How to install.']),
  el('helix-outline-section', { anchor: 'props', label: 'Props', level: 2 }, ['What it takes.']),
  el('helix-outline-section', { anchor: 'events', label: 'Events', level: 2 }, ['What it sends.']),
  el('helix-outline', { behavior: 'instant', label: 'On this page' }),
])

/** Outlines: marking as the page scrolls, and a press on a link. */
export const OUTLINE: readonly Scenario[] = [
  {
    family: 'outline',
    intents: [
      { kind: 'scroll', x: 0, y: 250 },
      { kind: 'scroll', x: 0, y: 0 },
    ],
    name: 'marks the section being read as the page scrolls, and sends activate',
    setup: page,
  },
  {
    family: 'outline',
    intents: [{ kind: 'press', link: 'props' }],
    name: 'a press on a link goes to its section and marks it',
    setup: page,
  },
]
