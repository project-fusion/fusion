import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Carousel. The record says what each pane and dot is called,
 * which dot is current, whether the arrows have anywhere to go, and what the
 * rotation control is called. A dot is a row, by its place. A swipe is read from
 * laid-out lengths, so a jest spec of the phone holds that.
 */

const slide = (words: string): Setup => el('helix-card', {}, [words])

/** A carousel of `count` slides. */
const carousel = (props: Readonly<Record<string, PropValue>> = {}, count = 4): Setup =>
  el(
    'helix-carousel',
    { label: 'Folders', ...props },
    Array.from({ length: count }, (_, at) => slide(`Slide ${at + 1}`)),
  )

const press = (part: string) => ({ kind: 'press' as const, part })
const dot = (row: number) => ({ kind: 'press' as const, row })
const focus = (row: number) => ({ kind: 'focus' as const, row })
const key = (name: string) => ({ key: name, kind: 'key' as const })
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Carousels: its arrows, its dots, their keys, several across, a refusal, and rotation. */
export const CAROUSEL: readonly Scenario[] = [
  {
    family: 'carousel',
    intents: [press('next'), press('next'), press('previous')],
    name: 'the arrows move a slide at a time',
    setup: carousel(),
  },
  {
    family: 'carousel',
    intents: [press('previous'), press('next')],
    name: 'an arrow with nowhere to go stays, and says so',
    setup: carousel({}, 2),
  },
  {
    family: 'carousel',
    intents: [press('previous'), press('next'), press('next')],
    name: 'under loop the arrows go round',
    setup: carousel({ 'default-index': 1, loop: true }, 3),
  },
  {
    family: 'carousel',
    intents: [dot(2), dot(0)],
    name: 'a dot goes to its slide',
    setup: carousel(),
  },
  {
    family: 'carousel',
    intents: [focus(0), key('ArrowRight'), key('End'), key('Home'), key('ArrowLeft')],
    name: 'the keys on a dot move the slide and the focus with it',
    setup: carousel(),
  },
  {
    family: 'carousel',
    intents: [focus(0), key('ArrowDown'), key('ArrowRight'), key('ArrowUp')],
    name: 'a vertical carousel moves by its own arrow keys',
    setup: carousel({ orientation: 'vertical' }),
  },
  {
    family: 'carousel',
    intents: [press('next'), press('next'), press('next')],
    name: 'several across stop where the run ends',
    setup: carousel({ 'per-view': 3 }, 5),
  },
  {
    family: 'carousel',
    intents: [press('next'), press('next'), press('previous')],
    name: 'several at a time stop at every stop and the end',
    setup: carousel({ 'per-view': 2, 'slides-per-move': 2 }, 7),
  },
  {
    family: 'carousel',
    intents: [refuse('before-activate'), press('next')],
    name: 'a refused move keeps the slide',
    setup: carousel(),
  },
  {
    family: 'carousel',
    intents: [press('rotation'), press('rotation')],
    name: 'the rotation control is named by what it does',
    setup: carousel({ autoplay: true, interval: 100000 }),
  },
  {
    family: 'carousel',
    intents: [press('next')],
    name: 'the words a carousel speaks reach its parts',
    setup: carousel(
      {
        'indicator-label': 'Folie {index}',
        'indicators-label': '{label} Folien',
        'next-label': 'Weiter',
        'slide-label': '{index} von {count}',
      },
      2,
    ),
  },
  {
    family: 'carousel',
    intents: [press('next')],
    name: 'no arrows are drawn under controls none, and one slide draws no dots',
    setup: carousel({ controls: 'none' }, 1),
  },
]
