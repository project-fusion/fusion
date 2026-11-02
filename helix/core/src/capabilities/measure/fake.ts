import type { Rect } from '../types.generated.js'
import type { Measure } from './contract.generated.js'

/** A measure capability whose boxes a spec places, and whose observers a spec counts. */
export interface FakeMeasure<N> extends Measure<N> {
  /** How many observers of `node` are not stopped. */
  readonly observers: (node: N) => number

  /**
   * Gives `node` a box, as layout does, or takes its box away with `null`.
   * Its observers hear a box whose size differs from the one before, since a
   * platform reports a resize and does not report a move.
   */
  readonly place: (node: N, box: Rect | null) => void
}

const resized = (before: Rect | undefined, after: Rect): boolean =>
  before?.width !== after.width || before?.height !== after.height

/** A fake that holds the box placed on each node and calls its observers. */
export const fakeMeasure = <N>(): FakeMeasure<N> => {
  const boxes = new Map<N, Rect>()
  const heard = new Map<N, Set<(box: Rect) => void>>()
  return {
    box: (node) => boxes.get(node) ?? null,
    observe: (node, changed) => {
      /* Its own function, so the same `changed` observed twice is two
         observers, and each stop takes away only its own. */
      const one = (box: Rect): void => changed(box)
      const all = heard.get(node) ?? new Set()
      all.add(one)
      heard.set(node, all)
      return () => {
        all.delete(one)
      }
    },
    observers: (node) => heard.get(node)?.size ?? 0,
    place: (node, box) => {
      const before = boxes.get(node)
      if (box === null) {
        boxes.delete(node)
        return
      }
      boxes.set(node, box)
      if (resized(before, box)) {
        for (const one of [...(heard.get(node) ?? [])]) {
          one(box)
        }
      }
    },
  }
}
