import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Command, a palette of commands that filters as a reader types.
 * A record says what typing sends, what a choice sends, and whether the palette
 * stands open after it.
 */

/** Three commands, in a palette that opens at once. */
const palette = (props: Setup['props'] = {}): Setup =>
  el('helix-command', { 'default-open': true, label: 'Commands', ...props }, [
    el('helix-option', { value: 'new' }, ['New file']),
    el('helix-option', { value: 'open' }, ['Open folder']),
    el('helix-option', { value: 'save' }, ['Save all']),
  ])

/** Command: narrowing, running, refusing, running again, ways out, and the palette in the page. */
export const COMMAND: readonly Scenario[] = [
  {
    family: 'command',
    intents: [{ kind: 'type', text: 'sa' }],
    name: 'typing narrows the commands and runs none',
    setup: palette(),
  },
  {
    family: 'command',
    intents: [{ item: 'open', kind: 'press' }],
    name: 'a press runs the command and closes the palette',
    setup: palette(),
  },
  {
    family: 'command',
    intents: [
      { event: 'before-select', kind: 'refuse' },
      { item: 'save', kind: 'press' },
    ],
    name: 'a refused command runs nothing and keeps the palette open',
    setup: palette(),
  },
  {
    family: 'command',
    intents: [{ by: 'escape', kind: 'dismiss' }],
    name: 'a close request closes it',
    setup: palette(),
  },
  {
    family: 'command',
    intents: [
      { item: 'save', kind: 'press' },
      { item: 'save', kind: 'press' },
    ],
    name: 'in the page a command runs twice and the list stays',
    setup: palette({ 'default-open': false, inline: true }),
  },
]
