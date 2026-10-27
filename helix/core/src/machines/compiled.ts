import type { Argument } from './statechart.js'

/*
 * What every module `helix system machines` compiles exports, as the code
 * that runs one and the specs that hold one to its machine read it. Each
 * module declares the same shapes for its own context, so any of them fits
 * these.
 */

/** An effect as a compiled module numbers it, with its argument where it has one. */
export type Done = readonly [effect: number, argument?: Argument]

/** A move as a compiled module returns one. */
export interface Moved<C> {
  readonly context: C
  readonly effects: readonly Done[]
  readonly state: number
}

/** A request as a compiled module returns one. */
export interface Asked<C> {
  readonly accept: Moved<C>
  readonly ask: readonly number[]
  readonly refuse: Moved<C>
}

/** A compiled module. */
export interface Compiled<C, I> {
  readonly ASKS: readonly string[]
  readonly EFFECTS: readonly string[]
  readonly EVENTS: readonly string[]
  readonly NODES: readonly string[]
  readonly STATES: readonly string[]
  readonly cancel: (state: number, context: C) => Moved<C> | undefined
  readonly entering: (state: number) => readonly Done[]
  readonly expire: (state: number, context: C, owner: number) => Moved<C> | undefined
  readonly mark: (state: number) => readonly string[]
  readonly start: (context: C) => number
  readonly step: (
    state: number,
    context: C,
    event: number,
    input: I,
  ) => Moved<C> | Asked<C> | undefined
}
