/**
 * What a tour does as it reaches a stop: runs the stop's `effect`, and at a
 * `wait` stop waits for the stop's target to register, as the web's tour
 * does.
 */
import { useEffect, useRef, useState } from 'react'
import type { Props } from '../render/behavior'
import { observeTargets, targetNow } from '../render/targets'
import type { Family } from '../style/form'
import { tell } from './props'
import type { TourMoves } from './tour-moves'
import type { StopMember } from './tour-run'

/** Whether a value is a promise, which holds a stop back until it settles. */
const promised = (value: unknown): value is Promise<unknown> =>
  typeof (value as { readonly then?: unknown } | undefined)?.then === 'function'

/** The stop whose `effect` ran, and what runs as the tour leaves it. */
interface Entered {
  readonly key: object
  leave?: () => void
}

/** Keeps what an effect returned to run as the tour leaves its stop, or runs it where the tour has left. */
const keeper =
  (entered: { current: Entered | undefined }, key: object) =>
  (leave: unknown): void => {
    if (typeof leave !== 'function') {
      return
    }
    if (entered.current?.key === key) {
      entered.current.leave = leave as () => void
    } else {
      ;(leave as () => void)()
    }
  }

/**
 * Runs a stop's `effect` as the tour reaches it, with its index, its
 * target's view, and the tour's way on and way out, and holds the stop back
 * while a promise it returns settles, which a refused promise also ends.
 * What it returns, or resolves to, runs as the tour leaves the stop. Gives
 * the stop held back, or none.
 */
export const useStopEffect = (
  reached: readonly [object, StopMember] | undefined,
  at: number,
  latest: { readonly current: TourMoves },
): object | undefined => {
  const [preparing, setPreparing] = useState<object | undefined>(undefined)
  const entered = useRef<Entered | undefined>(undefined)
  const [key, member] = reached ?? []
  useEffect(() => {
    if (key === entered.current?.key) {
      return
    }
    entered.current?.leave?.()
    entered.current = key === undefined ? undefined : { key }
    setPreparing(undefined)
    const effect = member?.effect()
    if (key === undefined || typeof effect !== 'function') {
      return
    }
    const keep = keeper(entered, key)
    const ran: unknown = effect({
      index: at,
      next: () => latest.current.ask('next'),
      skip: () => latest.current.dismiss('request'),
      target: targetNow(member?.target() ?? ''),
    })
    if (!promised(ran)) {
      keep(ran)
      return
    }
    setPreparing(key)
    void ran
      .then(keep, () => undefined)
      .then(() => setPreparing((now) => (now === key ? undefined : now)))
  })
  useEffect(() => () => entered.current?.leave?.(), [])
  return preparing
}

/**
 * Waits at a `wait` stop for a view to register under `waitsFor`, after
 * `reports` with `waiting`, and moves on by itself once one does, a turn on,
 * so the move is a change of its own. Gives whether it waits now.
 */
export const useWaitStop = (
  family: Family,
  props: Props,
  reports: string | undefined,
  at: number,
  waitsFor: string | undefined,
  latest: { readonly current: TourMoves },
): boolean => {
  const [waiting, setWaiting] = useState(false)
  const told = useRef({ family, props, reports })
  told.current = { family, props, reports }
  useEffect(() => {
    if (waitsFor === undefined) {
      setWaiting(false)
      return undefined
    }
    const { family: sent, props: given, reports: event } = told.current
    if (event !== undefined) {
      tell(sent, given, event, { index: at, status: 'waiting' })
    }
    const done = () => {
      setWaiting(false)
      void Promise.resolve().then(() => {
        if (latest.current.standing().at === at) {
          latest.current.next()
        }
      })
    }
    if (targetNow(waitsFor) !== null) {
      done()
      return undefined
    }
    setWaiting(true)
    const stop = observeTargets(() => {
      if (targetNow(waitsFor) !== null) {
        stop()
        done()
      }
    })
    return stop
  }, [at, latest, waitsFor])
  return waiting
}
