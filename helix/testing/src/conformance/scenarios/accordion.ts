import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Accordion, whose sections open and close. An intent that
 * opens or closes a section presses its trigger, found by its summary, and
 * never the section's content.
 */

/** A section with its value, its summary, and its content, open where `open` says. */
const section = (value: string, summary: string, open = false) =>
  el('helix-accordion-item', { open, value }, [
    el('span', {}, [summary], 'summary'),
    `${summary} words`,
  ])

/** Shipping open, then Returns and Sizes closed, under the accordion's props. */
const accordion = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-accordion', props, [
    section('shipping', 'Shipping', true),
    section('returns', 'Returns'),
    section('sizes', 'Sizes'),
  ])

/** Accordions: each mode, a refused close, and a section the page opens. */
export const ACCORDION: readonly Scenario[] = [
  {
    family: 'accordion',
    intents: [
      { item: 'returns', kind: 'open' },
      { item: 'sizes', kind: 'open' },
      { item: 'shipping', kind: 'close' },
    ],
    name: 'sections open and close on their own where the accordion has no mode',
    setup: accordion(),
  },
  {
    family: 'accordion',
    intents: [
      { event: 'before-close', kind: 'refuse' },
      { item: 'shipping', kind: 'close' },
    ],
    name: 'a refused close keeps the section open',
    setup: accordion(),
  },
  {
    family: 'accordion',
    intents: [
      { item: 'returns', kind: 'open' },
      { item: 'returns', kind: 'close' },
    ],
    name: 'a section that opens closes the open one under single-collapsible, and closes itself',
    setup: accordion({ mode: 'single-collapsible' }),
  },
  {
    family: 'accordion',
    intents: [
      { item: 'shipping', kind: 'close' },
      { item: 'sizes', kind: 'open' },
    ],
    name: 'the open section stays open under single, and another opening closes it',
    setup: accordion({ mode: 'single' }),
  },
  {
    family: 'accordion',
    intents: [{ item: 'sizes', kind: 'set', prop: 'open', value: true }],
    name: 'a section the page opens closes the open one under single-collapsible',
    setup: accordion({ mode: 'single-collapsible' }),
  },
]
