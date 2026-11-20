import type { Dragged, Point } from '../types.generated.js'
import type { Gesture } from './contract.generated.js'
import { type DragTrack, trackDrag } from './drag.js'

/** One moment, as it was told, with the part it was told for. */
export interface Told<N> {
  readonly moved: Dragged
  readonly node: N
}

/**
 * A gesture capability that a spec drags a pointer on.
 *
 * **Its moments follow the web's rules**: the fake and `webGesture` tell them
 * through the same `trackDrag`, so a spec hears what a browser would report
 * for the same pointer. A part hears one drag at a time, and a later `drag`
 * of it replaces the one before, as on the web and in the native driver.
 */
export interface FakeGesture<N> extends Gesture<N> {
  /** Lets the system take the pointer down on `node`, as a browser's `pointercancel` does. */
  readonly cancel: (node: N) => void
  /**
   * Puts a pointer down on `node` at `at`. The drag that hears `node` hears
   * it, and leaves it alone where it already has a pointer down, as on the
   * web.
   */
  readonly down: (node: N, at: Point, pointer?: number) => void
  /** How many drags hear `node`: 1 from a `drag` until the stop of the latest, and 0 otherwise. */
  readonly listening: (node: N) => number
  /** Moves the pointer down on `node` to `to`. */
  readonly move: (node: N, to: Point) => void
  /** Every moment told to a listener, in order. */
  readonly told: readonly Told<N>[]
  /** Lets go of the pointer down on `node`, where it last was. */
  readonly up: (node: N) => void
}

/** The pointer a spec has down on a node, and where it is. */
interface Held {
  at: Point
  readonly pointer: number
}

/** The drag that hears a part. */
interface Drag {
  /** The `drag` call that heard the part last, whose stop is the one that ends the drag. */
  by: object
  readonly track: DragTrack
}

/** A fake that tells the moments of the drags a spec drives, and keeps each one. */
export const fakeGesture = <N>(): FakeGesture<N> => {
  const drags = new Map<N, Drag>()
  const held = new Map<N, Held>()
  const told: Told<N>[] = []
  /** `heard`, keeping each moment in `told` before it hears it. */
  const keeping =
    (node: N, heard: (moved: Dragged) => void) =>
    (moved: Dragged): void => {
      told.push({ moved, node })
      heard(moved)
    }
  return {
    cancel: (node) => {
      const one = held.get(node)
      if (one) {
        held.delete(node)
        drags.get(node)?.track.cancel(one.pointer)
      }
    },
    down: (node, at, pointer = 1) => {
      if (!held.has(node)) {
        held.set(node, { at, pointer })
      }
      drags.get(node)?.track.down(pointer, at)
    },
    drag: (node, setup, heard) => {
      const by = {}
      const was = drags.get(node)
      if (was) {
        was.by = by
        was.track.hear(setup, keeping(node, heard))
      }
      const drag = was ?? { by, track: trackDrag(setup, keeping(node, heard)) }
      drags.set(node, drag)
      return () => {
        if (drags.get(node) !== drag || drag.by !== by) {
          return
        }
        drags.delete(node)
        drag.track.stop()
      }
    },
    listening: (node) => (drags.has(node) ? 1 : 0),
    move: (node, to) => {
      const one = held.get(node)
      if (one) {
        one.at = to
        drags.get(node)?.track.move(one.pointer, to)
      }
    },
    told,
    up: (node) => {
      const one = held.get(node)
      if (one) {
        held.delete(node)
        drags.get(node)?.track.up(one.pointer, one.at)
      }
    },
  }
}
