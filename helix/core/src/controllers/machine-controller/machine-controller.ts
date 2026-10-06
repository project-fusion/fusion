import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { requestChange } from '../../utils/request-change/request-change.js'
import { type Machine, type MachineEvent, step } from './machine.js'

/*
 * **Not exported from `@fusion.dev/helix-core`, because its pilot failed the
 * byte bar.** The state-machine evaluation of October 6, 2026 asked for a pilot
 * in Tour, kept only if the helper cost the core floor 600 bytes gzip or less
 * and Tour's headless Added grew by 150 bytes or less. Measured with the
 * scorers' method on a `tsc` emit of source, the helper cost the floor 520
 * bytes, and Tour written as a table grew by 398 bytes, from 4,736 to 5,134.
 * The table's state, event, and effect names and its transition functions are
 * the cost. Sharing the transition functions and folding the focus effects
 * moved it by 10 bytes at most. Every other bar passed: the replay of defects
 * [7] and [8] failed five pure specs, Tour's internal fields went from 8 to 3,
 * 8 of its 9 distinct transitions had a pure spec, and every Tour spec and
 * Chromium drive matched the code before the pilot.
 *
 * Kept, with its specs, for a family with more modes than Tour, where the
 * table replaces more code than it adds: Carousel, Combobox, or the open
 * lifecycle that `OpenPhaseController` runs. Exporting it is one line in
 * `index.ts`.
 */

export * from './machine.js'

/** An effect a state runs: it may return a function that ends it. */
export type MachineEffect<E extends MachineEvent, C> = (
  context: C,
  by: E | undefined,
) => undefined | (() => void)

/** What a `MachineController` starts from and what it runs. */
export interface MachineOptions<S extends string, E extends MachineEvent, C, F extends string> {
  /** The context the machine starts with. */
  context: C

  /**
   * Each effect a state names, by name. It runs after the host renders the
   * state, with the event that entered it, and never on a server. The function
   * it returns runs when the state is left and when the host is disconnected.
   */
  effects: { [K in F]: MachineEffect<E, C> }

  /** The state the machine starts in, before the host's first `willUpdate`. */
  initial: S

  /**
   * Records a state on the host, or takes it off: the host's own
   * `toggleState`, passed in because it is protected.
   */
  mark?: (state: S, on: boolean) => void
}

/**
 * Runs a `Machine` on a host: holds the state and the context, moves them by
 * `step`, and runs each state's effects with their clean-ups.
 *
 * The host turns its property writes into events in `willUpdate`, so a write
 * moves the machine the way a press does, and the state a server prints comes
 * from properties. Effects run in `hostUpdated`, which a server never calls,
 * and none runs at the first update except a state's `atStart` effects: an
 * element served in a state was not moved there by anybody.
 */
export class MachineController<
  S extends string,
  E extends MachineEvent,
  C,
  F extends string = string,
> implements ReactiveController
{
  /** The current state. */
  state: S

  /** The current context. */
  context: C

  private readonly host: ReactiveControllerHost & EventTarget

  private readonly machine: Machine<S, E, C, F>

  private readonly options: MachineOptions<S, E, C, F>

  /** The event that entered the current state, which its effects are told. */
  private by: E | undefined = undefined

  /** The clean-ups of the effects that are running. */
  private ends: (() => void)[] = []

  /** Whether the host has finished its first update. */
  private live = false

  /** Whether the current state's effects have run. */
  private ran = false

  constructor(
    host: ReactiveControllerHost & EventTarget,
    machine: Machine<S, E, C, F>,
    options: MachineOptions<S, E, C, F>,
  ) {
    this.host = host
    this.machine = machine
    this.options = options
    this.state = options.initial
    this.context = options.context
    this.mark(this.state, true)
    host.addController(this)
  }

  /** Whether an event would move the machine, with nothing run or asked. */
  can(event: E): boolean {
    return step(this.machine, this.state, this.context, event).changed
  }

  /**
   * Moves the machine by an event, and returns whether it moved.
   *
   * A request is announced first and applies only where nobody refused it.
   * Entering a state ends the effects of the state it leaves at once, and runs
   * its own after the host's next update.
   */
  send(event: E): boolean {
    const next = step(this.machine, this.state, this.context, event)
    if (!next.changed) {
      return false
    }
    const apply = (): void => {
      if (next.entered) {
        this.end()
        this.by = event
      }
      this.mark(this.state, false)
      this.state = next.state
      this.context = next.context
      this.mark(this.state, true)
      this.host.requestUpdate()
    }
    if (next.ask) {
      return requestChange({ apply, event: next.ask, host: this.host, next: 0 })
    }
    apply()
    return true
  }

  hostConnected(): void {
    /* Back after a move: the effects ended on disconnect run again, with no
       event, because nobody moved the element to this state. */
    if (this.live) {
      this.by = undefined
      this.hostUpdated()
    }
  }

  hostUpdated(): void {
    const first = !this.live
    this.live = true
    if (this.ran) {
      return
    }
    this.ran = true
    const state = this.machine.states[this.state]
    for (const name of (first ? state.atStart : state.effects) ?? []) {
      const end = this.options.effects[name](this.context, first ? undefined : this.by)
      if (end) {
        this.ends.push(end)
      }
    }
  }

  hostDisconnected(): void {
    this.end()
  }

  /** Ends the running effects, so the next update runs the current state's. */
  private end(): void {
    for (const end of this.ends.splice(0)) {
      end()
    }
    this.ran = false
  }

  private mark(state: S, on: boolean): void {
    if (this.machine.states[state].mark) {
      this.options.mark?.(state, on)
    }
  }
}
