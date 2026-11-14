import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Copy Button, which copies its value as it is pressed.
 * Each half sets the clipboard capability's fake before it draws the setup,
 * so a copy is put on it, and the fake clock ends the result. The words
 * passed in stand in for the icon, so each half presses the button where its
 * words are drawn.
 */

/** A copy button for an install command, with words in place of its icon. */
const button = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-copy-button', { 'feedback-duration': 1000, ...props }, ['Copy'])

/** Copy buttons: a copy confirmed and ended, a copy with nothing to copy, and a disabled one. */
export const COPY_BUTTON: readonly Scenario[] = [
  {
    family: 'copy-button',
    intents: [{ kind: 'press' }, { kind: 'wait', ms: 999 }, { kind: 'wait', ms: 1 }],
    name: 'a press copies its value and confirms it for its feedback duration',
    setup: button({ value: 'npm i @fusion.dev/helix' }),
  },
  {
    family: 'copy-button',
    intents: [{ kind: 'press' }, { kind: 'wait', ms: 1000 }],
    name: 'a press with nothing to copy says it failed',
    setup: button(),
  },
  {
    family: 'copy-button',
    intents: [{ kind: 'press' }],
    name: 'a disabled button copies nothing',
    setup: button({ disabled: true, value: 'npm i @fusion.dev/helix' }),
  },
  {
    family: 'copy-button',
    intents: [{ kind: 'press' }, { kind: 'wait', ms: 1000 }],
    name: 'a button with no tooltip copies and confirms it',
    setup: button({ tooltip: 'none', value: 'npm i @fusion.dev/helix' }),
  },
]
