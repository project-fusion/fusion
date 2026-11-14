import type { Timers } from '../capabilities/timers/contract.generated.js'
import { timers } from '../capabilities/timers/index.js'
import type { Stop } from '../capabilities/types.generated.js'
import type { Asked, Compiled, Done, Moved } from './compiled.js'
import type { Argument } from './statechart.js'

/*
 * Runs a compiled machine: one runner for every machine and every platform.
 *
 * **Each event runs to completion.** An event sent while another is running,
 * by an effect or by a consumer answering a request, waits until the one
 * before it has moved the machine and run its effects. An effect that throws
 * ends its own event and no other: the events waiting still run, and the
 * error reaches whoever sent the event that started the run.
 *
 * **A move commits before its effects run.** The runner takes the move's
 * state and context and tells the platform, and then performs the effects in
 * the order the move lists them, so an effect reads the context it left and
 * the input of the event that caused it.
 *
 * **Deadlines are the runner's own.** The compiler adds `deadline` and
 * `deadline-end` to a machine with `after`, and the runner starts and stops a
 * timeout for each through the timers capability in use when the deadline
 * starts, so a host never sees them and a runner made before a platform set
 * its timers still keeps time.
 */

/** An effect's name, where the compiler adds it for a deadline. */
const DEADLINE = 'deadline'
const DEADLINE_END = 'deadline-end'

/**
 * What a machine's effects do on a platform: a function for each effect the
 * machine names, and the effects that tell the consumer something, which a
 * runner stopping for good leaves out. An effect is given the context the move
 * left, the effect's argument, and the input of the event that caused it,
 * which is `undefined` for a deadline, the cancel, and mounting.
 */
export interface Host<C, E extends string, I = unknown> {
  readonly notifies: readonly E[]
  readonly perform: {
    readonly [K in E]: (context: C, argument: Argument | undefined, input: I | undefined) => void
  }
}

/** The effects a compiled module names, without the two the runner performs itself. */
export type Performed<M extends { readonly EFFECTS: readonly string[] }> = Exclude<
  M['EFFECTS'][number],
  typeof DEADLINE | typeof DEADLINE_END
>

/** What a runner asks of the platform beside the host. */
export interface Platform<C> {
  /**
   * Sends each event a request asks with, in order, and answers whether every
   * one was accepted. `proposed` is the context the request would leave, from
   * which a platform reads the detail its events carry.
   */
  readonly ask: (events: readonly string[], proposed: C, context: C) => boolean

  /** Hears each move and each revision, after it commits and before any effect runs. */
  readonly changed?: (state: number, context: C) => void

  /** The timers deadlines run on. The timers capability in use where not given. */
  readonly timers?: Timers
}

/** A machine running. */
export interface Runner<C, I> {
  readonly context: () => C
  /** Runs the effects of the state the machine starts in, as a platform does once it is mounted. */
  readonly mount: () => void
  /**
   * Writes what the host's properties now say into the context, between
   * events and with no move, as a property changed partway through a press
   * reaches the machine. A property that decides the state is a seed, and
   * reaches the machine as an event.
   */
  readonly revise: (change: (context: C) => C) => void
  /**
   * Takes a context the host's properties wrote, and the state it reads as,
   * with no move and no effect, as a script writing a value the state is read
   * from does. Every deadline ends. For a machine whose state is a function
   * of its context, such as a selection a property holds.
   */
  readonly reseat: (context: C) => void
  /** Sends `event`, numbered as the module numbers it, with what it carries. */
  readonly send: (event: number, input: I) => void
  readonly state: () => number
  /**
   * Stops the machine for good: the rest of the move running, and the
   * machine's cancel where it has one, run without the effects that tell the
   * consumer; the events waiting are dropped; every deadline ends; and
   * nothing sent after it runs. A platform that mounts again makes a runner
   * of its own.
   */
  readonly stop: () => void
}

/** Starts a runner on `machine` in the state `context` reads as. */
export const run = <C, I, E extends string>(
  machine: Compiled<C, I>,
  context: C,
  host: Host<C, E, I>,
  platform: Platform<C>,
): Runner<C, I> => {
  const deadlines = new Map<number, Stop>()
  const waiting: (() => void)[] = []
  let current = context
  let state = machine.start(context)
  let running = false
  let stopped = false

  const perform = (done: Done, input: I | undefined): void => {
    const [code, argument] = done
    const name = machine.EFFECTS[code]
    if (name === DEADLINE) {
      begin(argument)
    } else if (name === DEADLINE_END) {
      end(argument)
    } else if (!(stopped && host.notifies.includes(name as E))) {
      host.perform[name as E](current, argument, input)
    }
  }

  const begin = (argument: Argument | undefined): void => {
    if (stopped) {
      return
    }
    const owner = Number(argument?.owner)
    deadlines.get(owner)?.()
    const clock = platform.timers ?? timers()
    deadlines.set(
      owner,
      clock.timeout(Number(argument?.ms), () => {
        deadlines.delete(owner)
        queue(() => apply(machine.expire(state, current, owner), undefined))
      }),
    )
  }

  const end = (argument: Argument | undefined): void => {
    const owner = Number(argument?.owner)
    deadlines.get(owner)?.()
    deadlines.delete(owner)
  }

  const apply = (move: Moved<C> | undefined, input: I | undefined): void => {
    if (move === undefined) {
      return
    }
    state = move.state
    current = move.context
    platform.changed?.(state, current)
    for (const done of move.effects) {
      perform(done, input)
    }
  }

  const answer = (asked: Asked<C>): Moved<C> => {
    const events = asked.ask.map((code) => machine.ASKS[code] ?? '')
    return platform.ask(events, asked.accept.context, current) ? asked.accept : asked.refuse
  }

  /* Runs every job waiting, each to completion, and throws the first error
     any of them threw once none is left. */
  const drain = (): void => {
    running = true
    let failed = false
    let failure: unknown
    for (let next = waiting.shift(); next !== undefined; next = waiting.shift()) {
      try {
        next()
      } catch (error) {
        if (!failed) {
          failed = true
          failure = error
        }
      }
    }
    running = false
    if (failed) {
      throw failure
    }
  }

  const queue = (job: () => void): void => {
    if (stopped) {
      return
    }
    waiting.push(job)
    if (!running) {
      drain()
    }
  }

  return {
    context: () => current,
    mount: () =>
      queue(() => {
        for (const done of machine.entering(state)) {
          perform(done, undefined)
        }
      }),
    reseat: (context) =>
      queue(() => {
        for (const ending of deadlines.values()) {
          ending()
        }
        deadlines.clear()
        current = context
        state = machine.start(context)
        platform.changed?.(state, current)
      }),
    revise: (change) =>
      queue(() => {
        current = change(current)
        platform.changed?.(state, current)
      }),
    send: (event, input) =>
      queue(() => {
        const answered = machine.step(state, current, event, input)
        apply(answered !== undefined && 'ask' in answered ? answer(answered) : answered, input)
      }),
    state: () => state,
    stop: () => {
      if (stopped) {
        return
      }
      stopped = true
      for (const ending of deadlines.values()) {
        ending()
      }
      deadlines.clear()
      waiting.length = 0
      waiting.push(() => apply(machine.cancel(state, current), undefined))
      if (!running) {
        drain()
      }
    },
  }
}
