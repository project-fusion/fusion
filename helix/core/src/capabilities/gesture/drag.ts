import type { Dragged, DragKind, DragSetup, Point } from '../types.generated.js'

/**
 * One drag's moments, told from the pointer's events. The web's implementation
 * feeds it a browser's pointer events and the fake feeds it the ones a spec
 * drives, so both tell the same moments by the same rules.
 */
export interface DragTrack {
  /** The system took the pointer `pointer`: tells `cancel` where it is the one down. */
  readonly cancel: (pointer: number) => void
  /** A pointer went down at `at`: tells `down` where no other is down. */
  readonly down: (pointer: number, at: Point) => void
  /**
   * Follows `setup` and tells `heard` from now on, in place of the setup and
   * the listener before. A pointer down carries on.
   */
  readonly hear: (setup: DragSetup, heard: (moved: Dragged) => void) => void
  /** A pointer moved to `at`: tells `lift` past the slop, then a `pass` for each stop crossed. */
  readonly move: (pointer: number, at: Point) => void
  /** The pointer down now, or `null` where none is. */
  readonly pointer: () => number | null
  /** Tells `cancel` where a pointer is down, and nothing after. */
  readonly stop: () => void
  /** A pointer went up at `at`: tells `drop` where it is the one down. */
  readonly up: (pointer: number, at: Point) => void
}

/** The pointer that went down, while it is down. */
interface Down {
  readonly pointer: number
  readonly start: Point
  /** Where it was last, for a `cancel` that carries no position of its own. */
  last: Point
  lifted: boolean
  /** How many stops lie behind it along the axis. */
  behind: number
}

/** The setup a drag follows and the listener it tells, which `hear` replaces together. */
interface Hearing {
  readonly heard: (moved: Dragged) => void
  readonly setup: DragSetup
}

/**
 * Whether `at` is `slop` or more from `start` in a straight line, as core's
 * reorder machine reads a press that lifts, so the driver lifts the part at
 * the move the machine does.
 */
const beyond = (start: Point, at: Point, slop: number): boolean =>
  Math.hypot(at.x - start.x, at.y - start.y) >= slop

/**
 * Tells `heard` the moments of a drag that follows `setup`.
 *
 * - `down` as a pointer goes down while no other is down. Only that pointer is
 *   heard until it goes up or the system takes it.
 * - `lift` once it travels `setup.slop` from where it went down, in a
 *   straight line.
 * - `pass` each time, once lifted, its position along `setup.axis` crosses one
 *   of `setup.stops`, in either direction: one for each stop a single move
 *   crosses. The move that lifts tells each stop crossed since the pointer went
 *   down, so the passes always add up to where the pointer is.
 * - `drop` as it goes up, and `cancel` as the system takes it or the drag
 *   stops.
 *
 * A stop lies behind the pointer once the pointer is past it, so a pointer
 * resting on a stop has not passed it.
 *
 * **A pointer down carries on through `hear`**, as the native driver carries
 * a press on into a later drag of its part. The later listener hears the rest
 * of the press, and passes the later stops from where the pointer is. A
 * pointer that has not lifted yet counts them from where it went down, so the
 * lift still tells each stop crossed since then.
 */
export const trackDrag = (setup: DragSetup, heard: (moved: Dragged) => void): DragTrack => {
  let down: Down | null = null
  let stopped = false
  let hearing: Hearing = { heard, setup }
  const along = (at: Point): number => (hearing.setup.axis === 'x' ? at.x : at.y)
  const behind = (at: Point): number =>
    hearing.setup.stops.filter((stop) => along(at) > stop).length
  /* Checked for each moment, so a listener that stops the drag while it hears
     one hears none of the rest. A drag heard again while a pass is told counts
     from where the pointer is, so the rest of that move's passes, counted at
     the stops before, are told to no one. */
  const tell = (kind: DragKind, pointer: number, at: Point, by: Hearing = hearing): void => {
    if (!stopped && by === hearing) {
      by.heard({ at: along(at), kind, pointer, x: at.x, y: at.y })
    }
  }
  /* The drag is over before the moment is told, so a listener that stops it
     then has nothing left to cancel. */
  const end = (kind: 'cancel' | 'drop', at: Point): void => {
    const was = down
    down = null
    if (was) {
      tell(kind, was.pointer, at)
    }
  }
  const mine = (pointer: number): Down | null => (down?.pointer === pointer ? down : null)
  const pass = (one: Down, at: Point): void => {
    const now = behind(at)
    const crossed = Math.abs(now - one.behind)
    one.behind = now
    const by = hearing
    for (let count = 0; count < crossed; count += 1) {
      tell('pass', one.pointer, at, by)
    }
  }
  return {
    cancel: (pointer) => {
      const one = mine(pointer)
      if (one) {
        end('cancel', one.last)
      }
    },
    down: (pointer, at) => {
      if (down || stopped) {
        return
      }
      down = { behind: behind(at), last: at, lifted: false, pointer, start: at }
      tell('down', pointer, at)
    },
    hear: (next, nextHeard) => {
      hearing = { heard: nextHeard, setup: next }
      if (down) {
        down.behind = behind(down.lifted ? down.last : down.start)
      }
    },
    move: (pointer, at) => {
      const one = mine(pointer)
      if (!one) {
        return
      }
      one.last = at
      if (!one.lifted) {
        if (!beyond(one.start, at, hearing.setup.slop)) {
          return
        }
        one.lifted = true
        tell('lift', pointer, at)
      }
      pass(one, at)
    },
    pointer: () => down?.pointer ?? null,
    stop: () => {
      if (down) {
        end('cancel', down.last)
      }
      stopped = true
    },
    up: (pointer, at) => {
      if (mine(pointer)) {
        end('drop', at)
      }
    },
  }
}
