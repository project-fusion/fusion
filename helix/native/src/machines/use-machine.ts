import type { Compiled } from '@fusion.dev/helix-core/machines/compiled'
import { type Host, type Platform, type Runner, run } from '@fusion.dev/helix-core/machines/runner'
import type { Argument } from '@fusion.dev/helix-core/machines/statechart'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** A machine as a component reads and drives it. */
export interface Hosted<C, I> {
  readonly context: C
  /** The custom states the machine marks in its state, which the styles read. */
  readonly marks: readonly string[]
  /** Writes a changed property into the context between events, as `Runner.revise` does. */
  readonly revise: (change: (context: C) => C) => void
  /** Takes a context a property wrote and the state it reads as, as `Runner.reseat` does. */
  readonly reseat: (context: C) => void
  /** Sends an event, numbered as the module numbers it. Nothing runs before the component mounts. */
  readonly send: (event: number, input: I) => void
  readonly state: number
}

interface Snapshot<C> {
  readonly context: C
  readonly state: number
}

/** An effect the runner asked for, kept until React has drawn the move that asked. */
interface Asked<C, I> {
  readonly argument: Argument | undefined
  readonly context: C
  readonly input: I | undefined
  readonly name: string
}

/** Whether `next` draws as `drawn` does: the same state, and the same value in each field in `draws`. */
const drawsAs = <C>(
  drawn: Snapshot<C>,
  next: Snapshot<C>,
  draws: readonly (keyof C)[] | undefined,
): boolean =>
  draws !== undefined &&
  next.state === drawn.state &&
  draws.every((name) => Object.is(next.context[name], drawn.context[name]))

/**
 * Hosts a compiled machine in a component.
 *
 * **The first render reads the state from the seed alone**, as the server's
 * did, and the runner starts once the component mounts. A later change to
 * `seed` is not read: a value is a seed, and a family turns a changed prop
 * into an event or a revision.
 *
 * **A move is drawn before its effects run.** The runner commits each move,
 * React draws it, and the effects run in a layout effect after that, so an
 * effect that focuses an item or measures a part finds the part drawn. Those
 * a stop leaves run as the component unmounts.
 *
 * **A move that changes nothing drawn costs no render.** `draws` names the
 * fields of the context the component's drawing reads. A move that leaves
 * the state and each of those fields as the last move sent to React left
 * them is not drawn, and its effects run at once, as the runner performs
 * them. Where a move before it still waits for React, its effects wait
 * behind that move's, so effects keep their order. Without `draws`, every
 * move is drawn. The `context` this returns is the one last drawn, so a
 * field outside `draws` may be older there than in the runner.
 *
 * **Each effect calls the host of the latest render**, so a callback bound
 * to a prop is never one a render has replaced. A runner stopped by an
 * unmount stays stopped, and a component mounted again, as React's strict
 * mode does, starts a runner of its own.
 */
export const useMachine = <C, I, E extends string>(
  machine: Compiled<C, I>,
  seed: C,
  host: Host<C, E, I>,
  ask: Platform<C>['ask'],
  draws?: readonly (keyof C)[],
): Hosted<C, I> => {
  const [snapshot, setSnapshot] = useState<Snapshot<C>>(() => ({
    context: seed,
    state: machine.start(seed),
  }))
  const latest = useRef({ ask, draws, host })
  const runner = useRef<Runner<C, I> | null>(null)
  const asked = useRef<Asked<C, I>[]>([])
  const first = useRef(snapshot.context)
  /* The last move sent to React, whether React has yet to draw it, and
     whether the effects of the move running now run at once. */
  const sent = useRef(snapshot)
  const waiting = useRef(false)
  const atOnce = useRef(false)

  /* The effects the runner asked for, run with the latest host. It reads only
     refs, so it is the same function every render. */
  const flush = useCallback((): void => {
    for (const one of asked.current.splice(0)) {
      latest.current.host.perform[one.name as E](one.context, one.argument, one.input)
    }
  }, [])

  useLayoutEffect(() => {
    latest.current = { ask, draws, host }
  })

  useLayoutEffect(() => {
    const keep =
      (name: string) => (context: C, argument: Argument | undefined, input: I | undefined) => {
        if (atOnce.current) {
          latest.current.host.perform[name as E](context, argument, input)
        } else {
          asked.current.push({ argument, context, input, name })
        }
      }
    const kept = Object.fromEntries(
      Object.keys(latest.current.host.perform).map((name) => [name, keep(name)]),
    ) as Host<C, E, I>['perform']
    const changed = (state: number, context: C): void => {
      const next = { context, state }
      const still = drawsAs(sent.current, next, latest.current.draws)
      atOnce.current = still && !waiting.current && asked.current.length === 0
      if (!still) {
        sent.current = next
        waiting.current = true
        setSnapshot(next)
      }
    }
    const running = run(
      machine,
      first.current,
      { notifies: latest.current.host.notifies, perform: kept },
      {
        ask: (events, proposed, context) => latest.current.ask(events, proposed, context),
        changed,
      },
    )
    runner.current = running
    atOnce.current = false
    running.mount()
    return () => {
      first.current = running.context()
      atOnce.current = false
      running.stop()
      runner.current = null
      flush()
    }
  }, [flush, machine])

  useLayoutEffect(() => {
    if (snapshot === sent.current) {
      waiting.current = false
    }
    flush()
  })

  /* Stable, as `flush` is, so a component can name them in an effect's dependencies. */
  const revise = useCallback((change: (context: C) => C) => runner.current?.revise(change), [])
  const send = useCallback((event: number, input: I) => runner.current?.send(event, input), [])
  const reseat = useCallback((context: C) => runner.current?.reseat(context), [])

  return {
    context: snapshot.context,
    marks: machine.mark(snapshot.state),
    reseat,
    revise,
    send,
    state: snapshot.state,
  }
}
