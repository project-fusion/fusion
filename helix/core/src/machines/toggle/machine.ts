import type { Answer, Statechart } from '../statechart.js'

/*
 * Toggle: one control that is on or off, and a press that turns it the other
 * way. A checkbox is checked, a switch is on, a toggle button is pressed, and
 * Motion Toggle has paused the page. A press is a request: every family asks
 * first with the cancelable `helix-before-check`, and where no listener
 * refuses it the control turns and says so. A refusal leaves the control as it was and says nothing.
 *
 * A checkbox can also show neither state, `indeterminate`, which the machine
 * calls mixed. It shows the dash over a checked state that stays underneath,
 * and a press resolves it as a native checkbox does: to the opposite of that
 * checked state. A refused press keeps the dash.
 *
 * The web elements do not run this machine. Checkbox and Switch hand the
 * press to a native `<input type="checkbox">`, and Toggle and Motion Toggle
 * to a native `<button>`, and each element turns through `toggled` in
 * `utils/toggled`, which the machine's spec holds to the machine. The gesture
 * is the press machine's: it hears the pointer and the keys and makes the
 * click, and the click is this machine's `PRESS`.
 *
 * The host holds the context in its properties: `checked` and `mixed` are
 * properties a script may write, so the machine is read from the host before
 * each event, and a write moves it with no event, as a script writing
 * `checked` does on the web. The three states are the three things `checked`
 * and `mixed` can say together, so each move leaves the machine in the state
 * its context starts in.
 */

/** What the machine holds between events. */
export interface ToggleContext {
  /** Whether the control is checked, on, or pressed. Under `mixed`, the state a press turns away from. */
  checked: boolean

  /** Whether the control is disabled. A disabled control takes no press. */
  disabled: boolean

  /** Whether the control shows neither state, as an indeterminate checkbox does. */
  mixed: boolean

  /** Whether a reader can see and focus the control and a press changes nothing, as `readonly` says. */
  readOnly: boolean
}

/** Whether the control shows neither state. */
export const isMixed = (context: ToggleContext): boolean => context.mixed

/** Whether the control is checked. */
export const isChecked = (context: ToggleContext): boolean => context.checked

/** Whether a press may change the control: it is neither disabled nor read-only. */
export const changeable = (context: ToggleContext): boolean =>
  !(context.disabled || context.readOnly)

/** Whether a press resolves a mixed control to checked: the state under the dash is unchecked. */
export const resolvesOn = (context: ToggleContext): boolean =>
  changeable(context) && !context.checked

/** Turns the control the other way, and resolves a mixed one. */
export const flip = (context: ToggleContext): ToggleContext => ({
  ...context,
  checked: !context.checked,
  mixed: false,
})

type State = 'mixed' | 'off' | 'on'

type Event = 'PRESS'

/**
 * `announce` tells the consumer the control turned: `input` and `change` on
 * Checkbox and Switch, `change` on Toggle and Motion Toggle. `report` hands
 * the form what the control submits, its value while checked and nothing
 * otherwise.
 */
type Effect = 'announce' | 'report'

type Way = Answer<State, ToggleContext, undefined, Effect>

/* Shared answers are named and never read through a property: a bundler keeps
   a property read, and the data would then reach every bundle. */

/** A press on an unchecked control asks `toggle`, then checks it and says so, where it takes the press. */
const check: Way = [
  {
    accept: { effects: ['announce'], target: 'on', update: flip },
    ask: 'toggle',
    guard: changeable,
    refuse: {},
  },
  'ignore',
]

/** A press on a checked control asks `toggle`, then unchecks it and says so, where it takes the press. */
const uncheck: Way = [
  {
    accept: { effects: ['announce'], target: 'off', update: flip },
    ask: 'toggle',
    guard: changeable,
    refuse: {},
  },
  'ignore',
]

/** A press on a mixed control asks `toggle`, then resolves it to the opposite of the state under the dash. */
const resolve: Way = [
  {
    accept: { effects: ['announce'], target: 'on', update: flip },
    ask: 'toggle',
    guard: resolvesOn,
    refuse: {},
  },
  {
    accept: { effects: ['announce'], target: 'off', update: flip },
    ask: 'toggle',
    guard: changeable,
    refuse: {},
  },
  'ignore',
]

/** The machine, written once. `toggle.generated.ts` is what runs. */
export const toggle: Statechart<State, Event, ToggleContext, undefined, Effect> = {
  effects: ['announce', 'report'],
  events: ['PRESS'],
  initial: [
    { guard: isMixed, target: 'mixed' },
    { guard: isChecked, target: 'on' },
    { target: 'off' },
  ],
  states: {
    /* Neither checked nor unchecked: the dash, over the state in `checked`. */
    mixed: { entry: ['report'], on: { PRESS: resolve } },
    /* Unchecked, off, or not pressed. */
    off: { entry: ['report'], on: { PRESS: check } },
    /* Checked, on, or pressed. */
    on: { entry: ['report'], on: { PRESS: uncheck } },
  },
}
