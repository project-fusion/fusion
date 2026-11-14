import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Strands, whose ribbon is drawn on the GPU and out of a
 * screen reader's reach on both platforms. The record holds that a ribbon
 * takes no focus and says nothing as its form and its look change.
 */

const set = (prop: string, value: boolean | number | string) => ({
  kind: 'set' as const,
  prop,
  value,
})

/** Ribbons: a form that changes, and a look that changes, each heard as nothing. */
export const STRANDS: readonly Scenario[] = [
  {
    family: 'strands',
    intents: [set('pattern', 'waves'), set('pattern', 'ribbon')],
    name: 'a ribbon that changes its form takes no focus and says nothing',
    setup: el('helix-strands', { pattern: 'bend' }),
  },
  {
    family: 'strands',
    intents: [set('density', 0.2), set('clear', true), set('speed', 0)],
    name: 'a ribbon that changes its look takes no focus and says nothing',
    setup: el('helix-strands', {}),
  },
]
