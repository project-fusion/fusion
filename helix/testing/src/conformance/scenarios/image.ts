import { el, type Scenario } from '../format.js'
import { fakeImage } from '../images.js'

/*
 * The scenarios of Image, whose picture loads, fails, or hangs, from the
 * fake image source. Each half draws the picture its own way, and the
 * comparison holds the two records to each other.
 */

/** Images: a picture that loads, a new one that fails, and one that never answers. */
export const IMAGE: readonly Scenario[] = [
  {
    family: 'image',
    intents: [
      { kind: 'set', prop: 'src', value: fakeImage('loads') },
      { kind: 'set', prop: 'src', value: fakeImage('fails') },
      { kind: 'set', prop: 'src', value: fakeImage('hangs') },
      { kind: 'set', prop: 'src', value: fakeImage('loads', 'again') },
    ],
    name: 'each new source starts over and answers once',
    setup: el('helix-image', { alt: 'A lake' }),
  },
]
