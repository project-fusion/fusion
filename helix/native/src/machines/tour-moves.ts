/**
 * A tour's moves, as the web's tour makes them: on, back, out, and the end.
 *
 * - **A move asks `before` first**, which a handler may refuse, and sends
 *   `moves` once it stands, each with the new index as `value`.
 * - **Next on the last stop finishes the tour**: `completes`, then `reports`
 *   with `completed`, and the toggle stands closed with nothing asked, as
 *   the web assigns `open` and announces `toggle` as it updates.
 * - **A skip asks the toggle's `closes` first**, which a handler may refuse,
 *   then stands closed, which the web's `requestOpen` announces at once,
 *   then sends `reports` with `skipped`.
 * - **Back passes over a `wait` stop**, and the arrow keys along the line
 *   never finish the tour.
 */
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { handlerOf, tell, told } from './props'
import type { Turned } from './toggle'
import { type Moves, type Standing, type StopMember, stopBefore } from './tour-run'

/** What a tour's moves read, at one render. */
export interface Moving {
  readonly at: number
  readonly count: number
  /** The events the tour's source names, by the field that names each. */
  readonly event: (name: string) => string | undefined
  readonly family: Family
  readonly members: readonly (readonly [object, StopMember])[]
  readonly open: boolean
  /** What a press outside a stop and its target does: `close` ends the tour. */
  readonly outside: unknown
  readonly props: Props
  /** Takes the tour to the stop at an index, once the move stands. */
  readonly stand: (to: number) => void
  readonly standing: () => Standing
  readonly toggled: Turned | undefined
}

/** A tour's moves, and its way on, which a `wait` stop takes by itself. */
export type TourMoves = Moves & { readonly next: () => void; readonly props: Props }

/** The moves of a tour as it stands at one render. */
export const movesOf = (moving: Moving): TourMoves => {
  const { at, count, event, family, members, open, props, toggled } = moving
  const move = (to: number) => {
    if (!tell(family, props, event('before') ?? '', { value: String(to) })) {
      return
    }
    moving.stand(to)
    tell(family, props, event('moves') ?? '', { value: String(to) })
  }
  const report = (status: 'completed' | 'skipped') => {
    const reports = event('reports')
    if (reports !== undefined) {
      tell(family, props, reports, { index: at, status })
    }
  }
  const next = () => {
    if (at < count - 1) {
      move(at + 1)
      return
    }
    tell(family, props, event('completes') ?? '', { value: String(at) })
    report('completed')
    toggled?.stand?.(false)
  }
  const before = () =>
    stopBefore(
      members.map(([, one]) => one.type()),
      at,
    )
  const back = () => {
    const to = before()
    if (to !== undefined) {
      move(to)
    }
  }
  const skip = () => {
    const closes = family.api?.toggle?.closes
    const asked = closes === undefined ? undefined : told(family, props, closes, { open: false })
    if (open && asked?.defaultPrevented !== true) {
      toggled?.stand?.(false)
      report('skipped')
    }
  }
  /* The stop's event, where it sent one, reaches the tour's handler as the
     same event, and the tour sends its own where no stop sent one. */
  const hear = (what: string, heard: unknown) => {
    const asks = event('asks')
    const handler = asks === undefined ? undefined : props[handlerOf(asks)]
    if (heard === undefined && asks !== undefined) {
      tell(family, props, asks, { what })
    } else if (typeof handler === 'function') {
      handler(heard)
    }
  }
  const ways = { back, next, skip }
  return {
    arrow: (step) => {
      const goes = step === 1 ? at < count - 1 : before() !== undefined
      if (open && goes) {
        ;(step === 1 ? next : back)()
      }
      return open && goes
    },
    ask: (what, heard) => {
      hear(what, heard)
      ways[what]()
    },
    dismiss: (by) => {
      if (by === 'request' || moving.outside === 'close') {
        skip()
      }
      return true
    },
    next,
    props,
    standing: moving.standing,
  }
}
