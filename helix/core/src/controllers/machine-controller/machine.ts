/*
 * The table a `MachineController` runs, and `step`, which reads it: types and
 * one pure function, with no element and no event class loaded, so a pure spec
 * walks a table without a page.
 */

/** Something that happens to a machine, named by `type`, with whatever it carries. */
export interface MachineEvent {
  /** The event's name, such as `NEXT`. */
  type: string
}

/** One way an event moves a machine. Every function on it is pure. */
export interface Transition<S extends string, E extends MachineEvent, C> {
  /**
   * The cancelable event announced before the move, which makes the move a
   * request. It goes through `requestChange`, so a listener calling
   * `preventDefault()` refuses it, and a refusal changes nothing, as a failed
   * guard does.
   */
  ask?: ((context: C, event: E) => Event) | undefined

  /** The context after the move. */
  assign?: (context: C, event: E) => C

  /** Whether this way applies. The first way whose guard passes is taken. */
  guard?: (context: C, event: E) => boolean

  /**
   * The state the move enters. Given, the state is entered again even where it
   * is the same state, so its effects end and run again. Left out, the machine
   * stays where it is and only `assign` applies.
   */
  to?: S | ((context: C, event: E) => S) | undefined
}

/**
 * What a state does with one event: one way, ways tried in order, or
 * `'ignore'`, which says in the table that the state hears the event and does
 * nothing with it.
 */
export type MachineAnswer<S extends string, E extends MachineEvent, C> =
  | Transition<S, E, C>
  | readonly Transition<S, E, C>[]
  | 'ignore'

/** One state of a machine: its answers to events, and the effects it runs. */
export interface MachineState<S extends string, E extends MachineEvent, C, F extends string> {
  /**
   * The effects that also run when the element starts in this state, at its
   * first update. They run with no event, because nobody moved the element
   * there. Every other effect waits for a move.
   */
  atStart?: readonly F[]

  /** The effects that run while the element is in this state, by name. */
  effects?: readonly F[]

  /** Records the state on the host as `:state(<name>)` while it is current. */
  mark?: boolean

  /** What each event does in this state. An event left out changes nothing. */
  on?: { [T in E['type']]?: MachineAnswer<S, E, C> }
}

/**
 * A table of states. Each state lists the events it answers and the effects
 * it runs. The effects are named here and written on the element, so the table
 * stays pure and a spec can walk it.
 */
export interface Machine<S extends string, E extends MachineEvent, C, F extends string = string> {
  /** Every state, by name. */
  states: { [K in S]: MachineState<S, E, C, F> }
}

/**
 * The exhaustive form of a machine: every state answers every event, with a
 * transition or with `'ignore'`. A table typed this way cannot leave a pair
 * out by accident, so a reviewer reads every pair the machine ignores.
 */
export interface ExhaustiveMachine<
  S extends string,
  E extends MachineEvent,
  C,
  F extends string = string,
> extends Machine<S, E, C, F> {
  states: {
    [K in S]: MachineState<S, E, C, F> & { on: { [T in E['type']]: MachineAnswer<S, E, C> } }
  }
}

/** What one event does to a state and its context. */
export interface MachineStep<S extends string, C> {
  /** Makes the event announced before the move, where the move is a request. */
  ask?: (() => Event) | undefined

  /** Whether anything moves: the state, the context, or both. */
  changed: boolean

  /** The context after the event. */
  context: C

  /** Whether the event enters a state, so its effects end and run again. */
  entered: boolean

  /** The state after the event. */
  state: S
}

/**
 * What an event does to a state and its context, with nothing run.
 *
 * Takes the first way whose guard passes. An event the state does not answer,
 * an event it ignores, and an event whose guards all fail change nothing.
 */
export const step = <S extends string, E extends MachineEvent, C>(
  machine: Machine<S, E, C, string>,
  state: S,
  context: C,
  event: E,
): MachineStep<S, C> => {
  const answer = machine.states[state].on?.[event.type as E['type']]
  const ways = answer === undefined || answer === 'ignore' ? [] : [answer].flat()
  for (const way of ways as Transition<S, E, C>[]) {
    if (way.guard?.(context, event) === false) {
      continue
    }
    const next = way.assign ? way.assign(context, event) : context
    const entered = way.to !== undefined
    const ask = way.ask
    return {
      ask: ask && (() => ask(context, event)),
      changed: entered || next !== context,
      context: next,
      entered,
      state: typeof way.to === 'function' ? way.to(context, event) : (way.to ?? state),
    }
  }
  return { changed: false, context, entered: false, state }
}
