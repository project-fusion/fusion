import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Terminal, whose screen the web hands to a renderer and a
 * phone draws itself: the controls of its frame, which both draw. Neither
 * half connects a process, so the record is what the frame sends.
 */

/** Terminals: Restart once the process exited, and the controls that send nothing. */
export const TERMINAL: readonly Scenario[] = [
  {
    family: 'terminal',
    intents: [{ kind: 'press', label: 'Restart' }],
    name: 'Restart asks for another process once the last one exited',
    setup: el('helix-terminal', { 'exit-code': 1, label: 'shell' }),
  },
  {
    family: 'terminal',
    intents: [{ kind: 'press', label: 'Clear' }],
    name: 'the clear control sends nothing to the page',
    setup: el('helix-terminal', { label: 'shell' }),
  },
]
