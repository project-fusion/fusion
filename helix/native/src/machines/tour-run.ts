/**
 * What a tour gives the stops drawn inside it, and what each stop tells the
 * tour of itself, as the web's tour reads its stops from its slot and writes
 * their place on them.
 *
 * **The tour is a context its stops join**, since a phone has no children
 * to read: a stop joins as it is first drawn, so the tour knows its stops in
 * the order React draws them, as the web reads its children in document
 * order.
 */
import { createContext } from 'react'
import type { Props } from '../render/behavior'

/** What a stop's layer tells the stop back: whether focus is inside it, and its own view. */
export interface StopLayer {
  readonly holds?: () => boolean
  readonly view?: () => unknown
}

/** What a stop tells the tour of itself, read as the tour needs it. */
export interface StopMember {
  /** What runs as the tour reaches the stop: its `effect`. */
  readonly effect: () => unknown
  /** What the stop's layer tells it back. */
  readonly layer: () => StopLayer
  /** The id of the view it points at: its `for`. */
  readonly target: () => string
  /** What kind of stop it is: `dialog`, `floating`, `wait`, or a bubble. */
  readonly type: () => string | undefined
}

/** Where the tour stands, as a stop reads it. */
export interface Standing {
  /** The index of the stop shown, or -1 where there are none. */
  readonly at: number
  readonly count: number
  /** The first stop shown since the tour opened, which says the tour's name. */
  readonly greets: object | undefined
  readonly open: boolean
  /** The stop held back while its `effect` settles. */
  readonly preparing: object | undefined
  /** The tour's props, whose labels stand over each stop's own. */
  readonly props: Props
}

/** What a tour gives its stops. */
export interface TourRun {
  /**
   * Answers a press on one of a stop's controls: on, back, or out. The
   * stop's event, where it sent one, reaches the tour's handler as the same
   * event, as the web's bubbles from the stop to the tour.
   */
  readonly ask: (what: 'back' | 'next' | 'skip', heard?: unknown) => void
  /** Goes on or back from a stop's panel, as Right and Left do there, and says whether it moved. */
  readonly arrow: (step: -1 | 1) => boolean
  /** Tells the stops the tour changed. */
  readonly changed: () => void
  /** Answers a close request or a press outside a stop, and says whether it took it. */
  readonly dismiss: (by: 'outside' | 'request' | 'swipe') => boolean
  /** Joins the tour, in the order stops first draw, and tells nobody. */
  readonly join: (key: object, member: StopMember) => void
  /** Leaves the tour, as a stop the page takes out does. */
  readonly leave: (key: object) => void
  /** Hears the tour change, until stopped. */
  readonly listen: (heard: () => void) => () => void
  /** The stops, in the order they joined. */
  readonly members: () => readonly (readonly [object, StopMember])[]
  /** Where the tour stands now. */
  readonly standing: () => Standing
  /** A count that moves each time the tour changes, which a stop draws again on. */
  readonly version: () => number
}

/** The tour a stop is drawn in, where it is drawn in one. */
export const TourContext = createContext<TourRun | undefined>(undefined)

/** What the tour's moves are, which `makeRun` answers through. */
export interface Moves {
  readonly ask: TourRun['ask']
  readonly arrow: TourRun['arrow']
  readonly dismiss: TourRun['dismiss']
  readonly standing: () => Standing
}

/** Makes a tour's run, which answers through what `latest` holds at each call. */
export const makeRun = (latest: { readonly current: Moves }): TourRun => {
  const members = new Map<object, StopMember>()
  const heard = new Set<() => void>()
  let version = 0
  const tell = () => {
    version += 1
    for (const hear of [...heard]) {
      hear()
    }
  }
  return {
    arrow: (step) => latest.current.arrow(step),
    ask: (what, heard) => latest.current.ask(what, heard),
    changed: tell,
    dismiss: (by) => latest.current.dismiss(by),
    join: (key, member) => {
      members.set(key, member)
    },
    leave: (key) => {
      if (members.delete(key)) {
        tell()
      }
    },
    listen: (hear) => {
      heard.add(hear)
      return () => {
        heard.delete(hear)
      }
    },
    members: () => [...members.entries()],
    standing: () => latest.current.standing(),
    version: () => version,
  }
}

/**
 * The stop Back goes to from `index`: the nearest one before it that is not
 * a `wait` stop, or `undefined` where there is none, as the web's
 * `stopBefore` finds it.
 */
export const stopBefore = (
  types: readonly (string | undefined)[],
  index: number,
): number | undefined => {
  for (let at = Math.min(index, types.length) - 1; at >= 0; at -= 1) {
    if (types[at] !== 'wait') {
      return at
    }
  }
  return undefined
}
