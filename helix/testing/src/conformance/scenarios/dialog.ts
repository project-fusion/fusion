import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Dialog, a modal layer. The page opens it by writing
 * `open`, as an app does from its own button, with focus on a control of
 * the page first, so a record says where focus goes as the dialog opens and
 * where it comes back.
 */

/**
 * A dialog that asks to rename a file, with one action, which a record names
 * by its value where focus is on it.
 */
const dialog = el('helix-dialog', { label: 'Rename the file' }, [
  'Choose a new name for the file.',
  el('helix-button', { value: 'save' }, ['Save']),
])

/** Dialogs: a close request, a refused one, and a press on the scrim. */
export const DIALOG: readonly Scenario[] = [
  {
    family: 'dialog',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes it and puts focus back on the page',
    setup: dialog,
  },
  {
    family: 'dialog',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-close', kind: 'refuse' },
      { by: 'back', kind: 'dismiss' },
      { by: 'reader', kind: 'dismiss' },
    ],
    name: 'a refused close request keeps it open',
    setup: dialog,
  },
  {
    family: 'dialog',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press on the scrim closes it',
    setup: dialog,
  },
]
