import { el, type Scenario } from '../format.js'

/** Buttons: a press, Enter and Space, and a button that is disabled or pending. */
export const BUTTON: readonly Scenario[] = [
  {
    family: 'button',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press sends press, with what pressed it',
    setup: el('helix-button', {}, ['Save']),
  },
  {
    family: 'button',
    intents: [{ kind: 'focus' }, { key: 'Enter', kind: 'key' }, { key: ' ', kind: 'key' }],
    name: 'Enter and Space press the button with focus',
    setup: el('helix-button', {}, ['Save']),
  },
  {
    family: 'button',
    intents: [{ kind: 'press' }],
    name: 'a disabled button sends nothing',
    setup: el('helix-button', { disabled: true }, ['Save']),
  },
  {
    family: 'button',
    intents: [{ kind: 'focus' }, { kind: 'press' }, { key: 'Enter', kind: 'key' }],
    name: 'a disabled button that keeps its focus takes it, and sends nothing',
    setup: el('helix-button', { disabled: true, 'focusable-when-disabled': true }, ['Save']),
  },
  {
    family: 'button',
    intents: [{ kind: 'press' }],
    name: 'a pending button sends nothing',
    setup: el('helix-button', { pending: true }, ['Save']),
  },
]
