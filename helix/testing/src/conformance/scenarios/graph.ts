import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Graph, a frame around a graph of notes and the list that
 * makes it readable. Both halves press the list's rows and the legend's
 * groups and type into the search, and the comparison holds the two records
 * to each other: each `before-activate` and `activate` a selection sends,
 * each `before-graph-filter` and `graph-filter` a legend press sends, and
 * what a screen reader hears.
 */

/** Five notes in two groups, one linked to three and one to none, with the frame's props. */
const notes = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  graph: {
    links: [
      { source: 'pricing', target: 'plans' },
      { source: 'churn', target: 'pricing' },
      { source: 'pricing', target: 'budget' },
      { source: 'budget', target: 'pricing' },
    ],
    nodes: [
      { group: 'Sources', id: 'pricing', label: 'Pricing' },
      { group: 'Sources', id: 'plans', label: 'Plans and tiers' },
      { group: 'Answers', id: 'churn', label: 'Churn review' },
      { group: 'Answers', id: 'budget', label: 'Budget' },
      { group: 'Answers', id: 'hiring', label: 'Hiring plan' },
    ],
  },
  props: { label: 'Company notes', ...props },
  tag: 'helix-graph',
})

/** Graphs: a selection asked and made, one refused, the legend hiding a group, and the search. */
export const GRAPH: readonly Scenario[] = [
  {
    family: 'graph',
    intents: [
      { kind: 'press', label: 'Churn review' },
      { kind: 'press', label: 'Hiring plan' },
    ],
    name: 'a row pressed asks for its note, then selects it and says it',
    setup: notes(),
  },
  {
    family: 'graph',
    intents: [
      { event: 'before-activate', kind: 'refuse' },
      { kind: 'press', label: 'Hiring plan' },
    ],
    name: 'a selection the page refuses leaves the selected note',
    setup: notes({ 'default-active': 'pricing' }),
  },
  {
    family: 'graph',
    intents: [
      { kind: 'press', label: 'Answers' },
      { kind: 'press', label: 'Answers' },
    ],
    name: 'a group in the legend hides its notes and shows them again, asking first',
    setup: notes({ legend: true }),
  },
  {
    family: 'graph',
    intents: [{ kind: 'type', text: 'pr' }],
    name: 'the search narrows the list and says the count',
    setup: notes(),
  },
]
