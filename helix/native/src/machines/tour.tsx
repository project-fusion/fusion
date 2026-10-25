/**
 * A guided tour, `tour` on the element that holds the stops: which stop
 * shows, what Next and Back do, when the tour is finished, what it waits
 * for, and where its light falls, as the web's `HelixHeadlessTour` holds
 * them.
 *
 * - **Its moves are the web's**, as `tour-moves.ts` says: each move asked
 *   first and told after, the end on the last stop, and a skip that a
 *   handler may refuse.
 * - **A stop's `effect` runs as the tour reaches it**, and a `wait` stop
 *   waits for its target to register, as `tour-steps.ts` says.
 * - **The spotlight falls on the current target**: the tour measures the
 *   view registered under the stop's `for` in the window each frame while
 *   it lights it, and gives the box with `padding` around it as the four
 *   lengths after `spot`, from where the layer host stands.
 * - **Focus follows the run**, as `tour-focus.ts` says.
 */
import { tourPlace } from '@fusion.dev/helix-core/derivations'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { observeTargets, targetNow } from '../render/targets'
import { useLayerHost } from '../root/layers'
import type { Family } from '../style/form'
import { boundTo, given } from './props'
import type { Turned } from './toggle'
import { useTourFocus } from './tour-focus'
import { movesOf, type TourMoves } from './tour-moves'
import { makeRun, TourContext, type TourRun } from './tour-run'
import { useStopEffect, useWaitStop } from './tour-steps'

/** A number a prop holds, from a number or its words, or `undefined`. */
const numberOf = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? Math.trunc(read) : undefined
}

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measures {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** The lit box, in points from the layer host's top and its left. */
interface Spot {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** Whether two boxes are the same box. */
const same = (one: Spot | undefined, other: Spot): boolean =>
  one !== undefined &&
  one.x === other.x &&
  one.y === other.y &&
  one.width === other.width &&
  one.height === other.height

/**
 * Measures the view registered under `id` each frame while `lit`, as the
 * box with `padding` around it, from where the layer host stands.
 */
const useSpot = (id: string, lit: boolean, padding: number): Spot | undefined => {
  const host = useLayerHost()
  const origin = host?.origin ?? { x: 0, y: 0 }
  const [spot, setSpot] = useState<Spot | undefined>(undefined)
  const target = useSyncExternalStore(observeTargets, () => targetNow(id))
  useEffect(() => {
    if (!lit || target === null) {
      setSpot(undefined)
      return undefined
    }
    let frame = 0
    const measure = () => {
      ;(target as Measures).measureInWindow?.((x, y, width, height) => {
        const next = {
          height: height + padding * 2,
          width: width + padding * 2,
          x: x - origin.x - padding,
          y: y - origin.y - padding,
        }
        setSpot((now) => (same(now, next) ? now : next))
      })
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [lit, origin.x, origin.y, padding, target])
  return lit ? spot : undefined
}

/**
 * The index the tour holds: a written index takes the tour there with
 * nothing sent, as a script writing the web element's property does, and a
 * move holds the index it moved to.
 */
const useIndex = (written: number | undefined) => {
  const [held, setHeld] = useState<number | undefined>(written)
  const wrote = useRef(written)
  useLayoutEffect(() => {
    if (written !== wrote.current) {
      wrote.current = written
      if (written !== undefined) {
        setHeld(written)
      }
    }
  })
  return [held, setHeld] as const
}

/** The first stop shown since the tour opened, which says the tour's name. */
const useGreets = (open: boolean, current: object | undefined, preparing: object | undefined) => {
  const greets = useRef<object | undefined>(undefined)
  if (!open) {
    greets.current = undefined
  } else if (greets.current === undefined && preparing !== current) {
    greets.current = current
  }
  return greets.current
}

/** Draws the stops again as the tour stands another way, or its props change. */
const useTellStops = (run: TourRun, said: string, props: Props) => {
  const was = useRef('')
  useLayoutEffect(() => {
    if (was.current !== said) {
      was.current = said
      run.changed()
    }
  })
  // biome-ignore lint/correctness/useExhaustiveDependencies: a stop reads its labels from the tour's props
  useEffect(() => {
    run.changed()
  }, [props, run])
}

/** The states the tour gives its host: what it lights, veils, prepares, and waits for, and the lit box. */
const statesOf = (
  named: (name: string) => string,
  given: {
    lit: boolean
    preparing: boolean
    spot: Spot | undefined
    veiled: boolean
    waiting: boolean
  },
): Record<string, boolean> => {
  const { spot } = given
  const lengths =
    spot === undefined
      ? {}
      : {
          [`${named('spot')}-height`]: spot.height,
          [`${named('spot')}-width`]: spot.width,
          [`${named('spot')}-x`]: spot.x,
          [`${named('spot')}-y`]: spot.y,
        }
  return {
    [named('lit')]: given.lit && spot !== undefined,
    [named('preparing')]: given.preparing,
    [named('veiled')]: given.veiled,
    [named('waiting')]: given.waiting,
    ...(lengths as unknown as Record<string, boolean>),
  }
}

/**
 * Whether a shown stop is lit, a bubble whose target is drawn, or veiled, a
 * dialog or a floating stop, or a bubble whose target is not drawn, as the
 * web's tour shows a stop with nothing to light over its backdrop. A `wait`
 * stop is neither.
 */
const lightOf = (
  showing: boolean,
  type: string | undefined,
  aimed: string,
  drawn: boolean,
): { readonly lit: boolean; readonly veiled: boolean } => {
  if (!showing || type === 'wait') {
    return { lit: false, veiled: false }
  }
  const lit = type === undefined && aimed !== '' && drawn
  return { lit, veiled: !lit }
}

/**
 * Hosts the tour an element that declares `tour` runs: the states it
 * names, the lengths of the lit box, and the context its stops join.
 */
export const useTour = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const prop = (name: string) => given(family, props, boundTo(use, name, 'prop'))
  const event = (name: string) => boundTo(use, name, 'event')
  const [held, setHeld] = useIndex(numberOf(prop('index')))
  const latest = useRef<TourMoves>(undefined as never)
  const [run] = useState<TourRun>(() => makeRun(latest))
  useSyncExternalStore(run.listen, run.version)
  const members = run.members()
  const count = members.length
  const at =
    count === 0 ? -1 : Math.max(0, Math.min(held ?? numberOf(prop('initial')) ?? 0, count - 1))
  const open = toggled?.checked === true
  const reached = open ? members[at] : undefined
  const [current, member] = members[at] ?? []
  const type = member?.type()
  const preparing = useStopEffect(reached, at, latest)
  const greets = useGreets(open, current, preparing)
  const standing = () => ({ at, count, greets, open, preparing, props })
  latest.current = movesOf({
    at,
    count,
    event,
    family,
    members,
    open,
    outside: prop('outside'),
    props,
    stand: setHeld,
    standing,
    toggled,
  })
  useTellStops(
    run,
    [at, count, open, greets === undefined, preparing === undefined].join(' '),
    props,
  )
  const waitsFor = open && type === 'wait' ? (member?.target() ?? '') : undefined
  const waiting = useWaitStop(family, props, event('reports'), at, waitsFor, latest)
  const aimed = type === undefined ? (member?.target() ?? '') : ''
  const registered = useSyncExternalStore(observeTargets, () => targetNow(aimed))
  const showing = open && member !== undefined && preparing !== current
  const { lit, veiled } = lightOf(showing, type, aimed, registered !== null)
  const spot = useSpot(aimed, lit, numberOf(prop('padding')) ?? 8)
  useTourFocus({ at, members, open, preparing })
  const named = (name: string) => boundTo(use, name, 'state') ?? name
  return {
    marks: [],
    parts: {
      host: {
        states: statesOf(named, { lit, preparing: preparing !== undefined, spot, veiled, waiting }),
      },
    },
    provide: (drawn: ReactNode) => <TourContext.Provider value={run}>{drawn}</TourContext.Provider>,
  }
}

/** A stop's place in its tour's words, such as "2 of 5". */
export const placeOf = (tour: Props, at: number, count: number): string =>
  count === 0 || at < 0 ? '' : tourPlace(tour, at + 1, count)
