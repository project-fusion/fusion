import type { Point, Scrolled } from '../types.generated.js'
import type { Scroll } from './contract.generated.js'
import { type ScrollLengths, scrolledAt } from './ends.js'

/** One call that scrolls or holds, as it was made. A lock's stop is kept as `unlock`. */
export type ScrollCall<N> =
  | { readonly call: 'by'; readonly node: N; readonly x: number; readonly y: number }
  | { readonly call: 'lock'; readonly node: N }
  | { readonly call: 'reveal'; readonly node: N }
  | {
      readonly call: 'to'
      readonly node: N
      readonly smooth: boolean
      readonly x: number
      readonly y: number
    }
  | { readonly call: 'unlock'; readonly node: N }

/** A scroll capability that keeps each node's offset and every call, for a spec to read. */
export interface FakeScroll<N> extends Scroll<N> {
  /** Every scroll, reveal, lock, and unlock, in order. Reading an offset is not kept. */
  readonly calls: readonly ScrollCall<N>[]

  /** The layers holding the page, in the order they took it. */
  readonly holders: () => readonly N[]

  /**
   * Sets how far `node` is scrolled, as a reader scrolling it does, and tells
   * each observer of `node` where it stands. No call is
   * kept.
   */
  readonly place: (node: N, offset: Point) => void

  /**
   * Sets how long `node`'s content and frame are, which where it stands is
   * read against. A node with none set holds nothing past its frame.
   */
  readonly size: (node: N, lengths: ScrollLengths) => void

  /**
   * Comes to rest, as a scroll that has stopped does, and tells each
   * observer of `node` where it stands, settled.
   */
  readonly settle: (node: N) => void
}

/**
 * A fake that keeps each node's offset and each call. `by` moves the offset
 * with no bound, and `reveal` leaves it where it is, since the fake has no
 * layout to measure. A layer that locks twice is one holder, as on the web,
 * and a stop lets go once.
 */
export const fakeScroll = <N>(): FakeScroll<N> => {
  const calls: ScrollCall<N>[] = []
  const offsets = new Map<N, Point>()
  const held = new Set<N>()
  const offset = (node: N): Point => offsets.get(node) ?? { x: 0, y: 0 }
  const lengths = new Map<N, ScrollLengths>()
  const observers = new Map<N, Set<(scrolled: Scrolled) => void>>()
  const NONE: ScrollLengths = { content: { height: 0, width: 0 }, frame: { height: 0, width: 0 } }
  /* Moves `node` and tells each observer where it stands. */
  const move = (node: N, at: Point, settled = false): void => {
    offsets.set(node, at)
    tell(node, settled)
  }
  const tell = (node: N, settled: boolean): void => {
    const standing = scrolledAt(offset(node), lengths.get(node) ?? NONE, settled)
    for (const one of [...(observers.get(node) ?? [])]) {
      one(standing)
    }
  }
  return {
    by: (node, x, y) => {
      calls.push({ call: 'by', node, x, y })
      const at = offset(node)
      move(node, { x: at.x + x, y: at.y + y })
    },
    calls,
    holders: () => [...held],
    lock: (node) => {
      calls.push({ call: 'lock', node })
      held.add(node)
      let open = true
      return () => {
        if (open && held.delete(node)) {
          calls.push({ call: 'unlock', node })
        }
        open = false
      }
    },
    observe: (node, changed) => {
      const heard = observers.get(node) ?? new Set()
      observers.set(node, heard)
      /* Its own function, so the same `changed` observed twice is two observers. */
      const one = (scrolled: Scrolled): void => changed(scrolled)
      heard.add(one)
      return () => {
        heard.delete(one)
      }
    },
    offset,
    place: (node, at) => {
      move(node, at)
    },
    reveal: (node) => {
      calls.push({ call: 'reveal', node })
    },
    settle: (node) => {
      tell(node, true)
    },
    size: (node, given) => {
      lengths.set(node, given)
    },
    to: (node, x, y, smooth) => {
      calls.push({ call: 'to', node, smooth, x, y })
      move(node, { x, y })
    },
  }
}
