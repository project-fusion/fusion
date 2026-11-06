import type { Statechart } from '../../statechart.js'

/*
 * A switch that asks before it turns on, and turns itself off after a
 * second. A fixture of the format, not a machine any family runs: it holds
 * the compiler to the reference over requests with two events and both
 * outcomes, effects with arguments, guarded answers, and a deadline.
 */

/** What the switch holds. */
export interface ToggleContext {
  /** How many presses were refused. */
  readonly refused: number

  /** Whether it is on. */
  readonly on: boolean

  /** Whether a press does nothing but count. */
  readonly stuck: boolean
}

/** What a press carries. */
export interface ToggleInput {
  /** How hard the press was. */
  readonly by: number
}

/** Whether the switch is on. */
export const lit = (context: ToggleContext): boolean => context.on

/** Whether a press does nothing but count. */
export const stuck = (context: ToggleContext): boolean => context.stuck

/** Whether the press was hard enough to ask. */
export const firm = (_context: ToggleContext, input: ToggleInput): boolean => input.by > 1

/** Counts a refused press, by how hard it was. */
export const counted = (context: ToggleContext, input: ToggleInput): ToggleContext => ({
  ...context,
  refused: context.refused + input.by,
})

/** Turns the switch on. */
export const switchedOn = (context: ToggleContext): ToggleContext => ({ ...context, on: true })

/** Turns the switch off. */
export const switchedOff = (context: ToggleContext): ToggleContext => ({ ...context, on: false })

type State = 'off' | 'on'

type Event = 'ASK' | 'FLIP'

type Effect = 'glow' | 'hum' | 'say'

/** The fixture, written once. `toggle.generated.ts` is what runs. */
export const toggle: Statechart<State, Event, ToggleContext, ToggleInput, Effect> = {
  effects: ['glow', 'hum', 'say'],
  events: ['FLIP', 'ASK'],
  initial: [{ guard: lit, target: 'on' }, { target: 'off' }],
  states: {
    off: {
      entry: ['say'],
      on: {
        ASK: [
          {
            accept: {
              effects: [{ effect: 'hum', with: { level: 2, loud: true, tone: 'low' } }],
              target: 'on',
              update: switchedOn,
            },
            ask: ['before-turn', 'turn'],
            guard: firm,
            refuse: { update: counted },
          },
          'ignore',
        ],
        FLIP: { effects: ['glow'], target: 'on', update: switchedOn },
      },
    },
    on: {
      after: { effects: ['say'], ms: 1000, target: 'off', update: switchedOff },
      exit: ['glow'],
      on: {
        ASK: {
          accept: { target: 'off', update: switchedOff },
          ask: 'before-turn',
          refuse: { effects: ['say'], target: 'on' },
        },
        FLIP: [
          { guard: stuck, update: counted },
          { target: 'off', update: switchedOff },
        ],
      },
    },
  },
}
