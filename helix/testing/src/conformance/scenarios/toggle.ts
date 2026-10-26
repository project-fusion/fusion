import { el, type Scenario } from '../format.js'

/*
 * The scenarios of the families that turn on and off, which run the toggle
 * machine. Both halves run each one, and the comparison holds the web's
 * record and React Native's to each other.
 */

/** A checkbox labeled Terms, with its props. */
const box = (props: Readonly<Record<string, boolean | string>> = {}) =>
  el('helix-checkbox', props, ['Terms'])

/** A switch labeled Wi-Fi, with its props. */
const lever = (props: Readonly<Record<string, boolean | string>> = {}) =>
  el('helix-switch', props, ['Wi-Fi'])

/** A toggle on its own, labeled Bold, with its props. */
const bold = (props: Readonly<Record<string, boolean | string>> = {}) =>
  el('helix-toggle', { value: 'bold', ...props }, ['Bold'])

/** Checkboxes: a press, Space, refusal, the mixed state, and a box that is read-only or disabled. */
export const CHECKBOX: readonly Scenario[] = [
  {
    family: 'checkbox',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press checks the box, and another unchecks it',
    setup: box(),
  },
  {
    family: 'checkbox',
    intents: [
      { kind: 'focus' },
      { key: ' ', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { key: ' ', kind: 'key' },
    ],
    name: 'Space checks the box with focus, Enter leaves it, and Space unchecks it',
    setup: box(),
  },
  {
    family: 'checkbox',
    intents: [{ event: 'before-check', kind: 'refuse' }, { kind: 'press' }],
    name: 'a refused turn leaves the box as it was',
    setup: box({ 'default-checked': true }),
  },
  {
    family: 'checkbox',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press resolves an indeterminate box to checked',
    setup: box({ indeterminate: true }),
  },
  {
    family: 'checkbox',
    intents: [{ kind: 'press' }],
    name: 'a press resolves an indeterminate box that is checked underneath to unchecked',
    setup: box({ 'default-checked': true, indeterminate: true }),
  },
  {
    family: 'checkbox',
    intents: [{ event: 'before-check', kind: 'refuse' }, { kind: 'press' }],
    name: 'a refused press keeps an indeterminate box mixed',
    setup: box({ indeterminate: true }),
  },
  {
    family: 'checkbox',
    intents: [{ kind: 'press' }],
    name: 'a read-only box takes no press',
    setup: box({ 'default-checked': true, readonly: true }),
  },
  {
    family: 'checkbox',
    intents: [{ kind: 'press' }],
    name: 'a disabled box takes no press',
    setup: box({ disabled: true }),
  },
  {
    family: 'checkbox',
    intents: [{ kind: 'set', prop: 'checked', value: true }, { kind: 'press' }],
    name: 'a box the page checks sends nothing, and a press unchecks it',
    setup: box(),
  },
]

/** Switches: a press, Space, refusal, and a switch that is read-only or disabled. */
export const SWITCH: readonly Scenario[] = [
  {
    family: 'switch',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press turns the switch on, and another turns it off',
    setup: lever(),
  },
  {
    family: 'switch',
    intents: [{ kind: 'focus' }, { key: ' ', kind: 'key' }, { key: 'Enter', kind: 'key' }],
    name: 'Space turns the switch with focus on, and Enter leaves it',
    setup: lever(),
  },
  {
    family: 'switch',
    intents: [{ event: 'before-check', kind: 'refuse' }, { kind: 'press' }],
    name: 'a refused turn leaves the switch as it was',
    setup: lever(),
  },
  {
    family: 'switch',
    intents: [{ kind: 'press' }],
    name: 'a read-only switch takes no press',
    setup: lever({ readonly: true }),
  },
  {
    family: 'switch',
    intents: [{ kind: 'press' }],
    name: 'a disabled switch takes no press',
    setup: lever({ disabled: true }),
  },
]

/** Toggle buttons on their own: a press, Enter and Space, refusal, and a disabled toggle. */
export const TOGGLE: readonly Scenario[] = [
  {
    family: 'toggle',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press presses the toggle, and another releases it',
    setup: bold(),
  },
  {
    family: 'toggle',
    intents: [{ kind: 'focus' }, { key: 'Enter', kind: 'key' }, { key: ' ', kind: 'key' }],
    name: 'Enter and Space press the toggle with focus, and release it',
    setup: bold(),
  },
  {
    family: 'toggle',
    intents: [{ kind: 'press' }, { event: 'before-check', kind: 'refuse' }, { kind: 'press' }],
    name: 'a refused turn holds a pressed toggle pressed',
    setup: bold(),
  },
  {
    family: 'toggle',
    intents: [{ kind: 'press' }],
    name: 'a disabled toggle takes no press',
    setup: bold({ disabled: true }),
  },
]

/**
 * Motion Toggle: a press pauses the page's motion and another lets it run,
 * and a refused press leaves it running.
 * Every scenario ends with motion running, since the choice is the page's.
 * The words are slotted inside its button, where a press lands.
 */
export const MOTION_TOGGLE: readonly Scenario[] = [
  {
    family: 'motion-toggle',
    intents: [{ kind: 'press' }, { kind: 'press' }],
    name: 'a press pauses the page, and another lets it run',
    setup: el('helix-motion-toggle', {}, ['Motion']),
  },
  {
    family: 'motion-toggle',
    intents: [{ event: 'before-check', kind: 'refuse' }, { kind: 'press' }],
    name: 'a refused turn leaves the page running',
    setup: el('helix-motion-toggle', {}, ['Motion']),
  },
]
