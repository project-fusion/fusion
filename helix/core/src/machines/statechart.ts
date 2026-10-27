/*
 * The format a machine is written in, Layer 2 of the intermediate layer spec
 * as revised on October 11, 2026. A machine is data: its states, the events
 * each state answers, the moves those make with their effects, and the named
 * pure functions its guards and updates call. `helix system machines` reads
 * it and writes a flat module beside it, `<machine>.generated.ts`, which is
 * what runs. No module the package exports imports the data, so none of it
 * reaches a bundle.
 */

/** Whether a move applies, from the context and the event's input. */
export type Guard<C, I> = (context: C, input: I) => boolean

/** The context after a move, from the context and the event's input. */
export type Update<C, I> = (context: C, input: I) => C

/** A literal an effect is given, such as how long a wait lasts. */
export type Argument = Readonly<Record<string, boolean | number | string>>

/** An effect: a capability the host performs, by name, or with a literal argument. */
export type Effect<X extends string> = X | { readonly effect: X; readonly with: Argument }

/**
 * One way an event moves a machine. A move leaves the states it leaves,
 * deepest first, runs their exit effects, then its own `effects`, then the
 * entry effects of the states it enters, outermost first.
 */
export interface Way<S extends string, C, I, X extends string> {
  /** What the move asks the host to do, in order, between leaving and entering. */
  effects?: readonly Effect<X>[]

  /** Applies only where it returns true. The first way whose guard passes is taken. */
  guard?: Guard<C, I>

  /**
   * The state entered. Given, the state is entered even where the machine is
   * already in it, so its exit and entry effects run. Left out, the machine
   * stays, `update` applies, and only the move's own effects run.
   */
  target?: S

  /** The context after the move. Left out, the context is unchanged. */
  update?: Update<C, I>
}

/** A way with no guard: one side of a request, a deadline's, `done`, or the cancel. */
export type Outcome<S extends string, C, I, X extends string> = Omit<Way<S, C, I, X>, 'guard'>

/**
 * A move that is a request. The cancelable events `ask` names are sent first,
 * in order, through `requestChange`, and the host stops at the first a
 * listener refuses. Where none is refused the machine takes `accept`, and
 * where one is it takes `refuse`. Either may change the context.
 */
export interface Request<S extends string, C, I, X extends string> {
  /** The move where no listener refused. */
  accept: Outcome<S, C, I, X>

  /** The cancelable event or events sent first, in order. */
  ask: string | readonly string[]

  /** Applies only where it returns true, as on a way. */
  guard?: Guard<C, I>

  /** The move where a listener refused. */
  refuse: Outcome<S, C, I, X>
}

/**
 * What a state does with one event: one way or request, `'ignore'`, or ways
 * tried in order, ending in one with no guard or in `'ignore'`.
 */
export type Answer<S extends string, C, I, X extends string> =
  | Way<S, C, I, X>
  | Request<S, C, I, X>
  | readonly (Way<S, C, I, X> | Request<S, C, I, X> | 'ignore')[]
  | 'ignore'

/**
 * A deadline: the way taken when a state has lasted `ms`. The compiler adds
 * the `deadline` effect as the state is entered and `deadline-end` as it is
 * left, each naming the state, so the timers capability every host shares
 * can drop a deadline its state outlived.
 */
export interface Deadline<S extends string, C, I, X extends string> extends Outcome<S, C, I, X> {
  /** How long the state lasts before the way is taken. */
  ms: number
}

/** A region of a parallel state: its states, and the one it starts in. */
export interface Region<S extends string, E extends string, C, I, X extends string> {
  /** The state the region starts in. */
  initial: S

  /** The region's states, which hold no others. */
  states: { [K in S]?: StateNode<S, E, C, I, X> }
}

/**
 * One state. A state may hold child states one level deep, with `initial`
 * naming the one entered with it, or regions that progress at once, but not
 * both.
 */
export interface StateNode<S extends string, E extends string, C, I, X extends string> {
  /** A deadline: the way taken when the state has lasted `ms`. */
  after?: Deadline<S, C, I, X>

  /** In a state with regions, the way taken once every region is in a final state. */
  done?: Outcome<S, C, I, X>

  /** The effects entering the state asks for, in order. */
  entry?: readonly Effect<X>[]

  /** The effects leaving the state asks for, in order. */
  exit?: readonly Effect<X>[]

  /** In a region, a state where the region is done. */
  final?: boolean

  /** In a state with children, the child entered with it. */
  initial?: S

  /**
   * Records the state on the host as `:state(<name>)` while it is active.
   * The name of a marked state is the only name the compiled module keeps.
   */
  mark?: boolean

  /**
   * What each event does. A leaf answers every event, if only with
   * `'ignore'`, or leaves an event to the state with children that holds it.
   * A state with regions answers nothing itself: each event is answered in
   * one of its regions.
   */
  on?: { [K in E]?: Answer<S, C, I, X> }

  /** Regions that progress at once. At most one region answers any event. */
  regions?: Readonly<Record<string, Region<S, E, C, I, X>>>

  /** Child states, one level deep. */
  states?: { [K in S]?: StateNode<S, E, C, I, X> }
}

/**
 * A machine. States, events, effects and requests are numbered in the order
 * they are written, and the compiled module knows them by those numbers.
 */
export interface Statechart<S extends string, E extends string, C, I, X extends string> {
  /** A way every state leaves by, to a state at rest. Unmounting runs it. */
  cancel?: Outcome<S, C, I, X>

  /** Every effect a move or a state names: a capability the host provides. */
  effects: readonly X[]

  /** Every event, which the host sends with an input. */
  events: readonly E[]

  /**
   * The state the machine is in, read from the context: the first way whose
   * guard passes. The host holds the context in its properties, so the
   * machine is read from them before each event.
   */
  initial: readonly { guard?: (context: C) => boolean; target: S }[]

  /** The states at the top of the machine. */
  states: { [K in S]?: StateNode<S, E, C, I, X> }
}
