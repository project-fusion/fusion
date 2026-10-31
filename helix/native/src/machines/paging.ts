/**
 * A part that snaps as a machine moves it: the places it can rest, a way to go
 * to one, and what it says as a reader moves it, as a carousel's track does. A
 * wheel of a time picker pages the same way.
 *
 * **The part's `scroll-snap-type` makes the snap**, and this reads where it rests.
 * Each box's `scroll-snap-align` gives a place, in the order they stand, and
 * `pick` keeps the ones a machine stops at.
 *
 * **A scroll of its own is not a reader saying where they went.** A press moves
 * the place and the part follows it; a swipe moves the part and the place follows
 * that. One rest cannot tell those apart, so a go marks itself, and the first
 * rest after it, or a touch, clears the mark. A scroll asked for where the part
 * stands never ends in a rest, and the touch is what clears that one.
 */
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { nearestOffset } from '@fusion.dev/helix-core/carousel'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HostInstance, ScrollViewInstance } from 'react-native'
import { useReducedMotion } from '../render/motion'

/** What `usePaging` hears from a machine. */
export interface PagingOptions {
  /** The axis the part scrolls along. */
  readonly axis: 'x' | 'y'
  /** Hears the place nearest where a reader's move stands now, as it moves. */
  readonly onMove?: (place: number) => void
  /** Hears the place a reader's move came to rest nearest. */
  readonly onRest: (place: number) => void
  /** The places a machine stops at, out of every place the part can rest. */
  readonly pick?: (every: readonly number[]) => readonly number[]
}

/** What `usePaging` gives a machine. */
export interface Paging {
  /** Scrolls to a place: at once where `still`, or where the reader asks for less motion. */
  readonly go: (place: number, still?: boolean) => void
  /** The offset of each place the part can rest, in order. */
  readonly offsets: readonly number[]
  /** What the part's view takes. */
  readonly view: Readonly<Record<string, unknown>>
}

/** How close, in points, a part stands to a place to stand at it. */
const ARRIVED = 1

/** Hosts a part that snaps. */
export const usePaging = ({ axis, onMove, onRest, pick }: PagingOptions): Paging => {
  const reduced = useReducedMotion()
  const [every, setEvery] = useState<readonly number[]>([])
  const [node, setNode] = useState<ScrollViewInstance | null>(null)
  const offsets = useMemo(() => (pick === undefined ? every : pick(every)), [every, pick])
  const ours = useRef(false)
  const stands = useRef(0)
  const now = useRef({ offsets, onMove, onRest, reduced })
  now.current = { offsets, onMove, onRest, reduced }

  useEffect(() => {
    if (node === null) {
      return undefined
    }
    return scroll().observe(node as unknown as HostInstance, (scrolled) => {
      const at = scrolled.offset[axis]
      stands.current = at
      const latest = now.current
      if (scrolled.settled) {
        if (ours.current) {
          ours.current = false
          return
        }
        latest.onRest(nearestOffset(latest.offsets, at))
      } else if (!ours.current) {
        latest.onMove?.(nearestOffset(latest.offsets, at))
      }
    })
  }, [axis, node])

  const go = useCallback(
    (place: number, still = false) => {
      const target = now.current.offsets[place]
      if (target === undefined || node === null) {
        return
      }
      const to = { [axis]: target }
      if (Math.abs(target - stands.current) < ARRIVED) {
        /* A scroll of ours on its way somewhere else stops here, and the mark goes with it. */
        if (ours.current) {
          node.scrollTo({ animated: false, ...to })
          ours.current = false
        }
        return
      }
      ours.current = true
      node.scrollTo({ animated: !still && !now.current.reduced, ...to })
    },
    [axis, node],
  )

  const take = useCallback(() => {
    ours.current = false
  }, [])
  const view = useMemo(
    () => ({
      onSnapOffsets: setEvery,
      onTouchStart: take,
      scrollerRef: setNode,
      snapOffsets: offsets,
    }),
    [offsets, take],
  )
  return { go, offsets, view }
}
