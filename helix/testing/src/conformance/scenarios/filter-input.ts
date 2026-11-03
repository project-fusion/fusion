import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Filter Input, a text field for filters with its suggestions
 * under it. A record says what typing sends, what a press on a suggestion sends,
 * and whether the list stands open after it.
 */

/** Two keys a reader can type, suggested under the field. */
const field = (props: Setup['props'] = {}): Setup =>
  el('helix-filter-input', { label: 'Filter rows', ...props }, [
    el('helix-option', { value: 'owner' }, ['owner'], 'suggestions'),
    el('helix-option', { value: 'status' }, ['status'], 'suggestions'),
  ])

/** Filter Input: typing, a refused edit, a suggestion pressed, and a way out. */
export const FILTER_INPUT: readonly Scenario[] = [
  {
    family: 'filter-input',
    intents: [{ kind: 'type', text: 'ow' }],
    name: 'typing opens the suggestions and says the text changed',
    setup: field(),
  },
  {
    family: 'filter-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: 'ow' },
    ],
    name: 'a refused edit keeps the text',
    setup: field(),
  },
  {
    family: 'filter-input',
    intents: [
      { kind: 'type', text: 'o' },
      { item: 'owner', kind: 'press' },
    ],
    name: 'a press on a suggestion says before-select and keeps the list open',
    setup: field(),
  },
  {
    family: 'filter-input',
    intents: [
      { kind: 'type', text: 'o' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes the suggestions',
    setup: field(),
  },
]
