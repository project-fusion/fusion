/**
 * The scroll machine an element that declares a `scroll` runs: where its
 * part that scrolls stands, as the states its source names, and the events
 * it sends as the part moves and comes to rest, as a scroll area is in
 * `more-block-end` while there is more past its bottom edge.
 *
 * **It reads the scroll capability's `observe`**, as the web element reads
 * the box it scrolls, so the two stand at the same ends from the same
 * offsets and lengths.
 */
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Scrolled } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HostInstance } from 'react-native'
import { standingOf } from '../capabilities/scroll'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, tell } from './props'
import { useScrollKeys } from './scroll-keys'

/** Whether what the part holds is longer than the part on an axis: an axis that does not stand at both ends. */
const overflowing = (at: Scrolled | undefined): boolean =>
  at !== undefined && (!(at.x.start && at.x.end) || !(at.y.start && at.y.end))

/** Each edge's state, from where the part stands: more past an edge is that edge not reached. */
const statesOf = (use: MachineUse, at: Scrolled | undefined): Record<string, boolean> => {
  const states: Record<string, boolean> = {}
  const edges: readonly (readonly [string, boolean])[] = [
    ['block-start', at !== undefined && !at.y.start],
    ['block-end', at !== undefined && !at.y.end],
    ['inline-start', at !== undefined && !at.x.start],
    ['inline-end', at !== undefined && !at.x.end],
  ]
  for (const [edge, more] of edges) {
    const state = boundTo(use, edge, 'state')
    if (state !== undefined) {
      states[state] = more
    }
  }
  const overflows = boundTo(use, 'overflows', 'state')
  if (overflows !== undefined) {
    states[overflows] = overflowing(at)
  }
  return states
}

/** Whether two standings hold at the same ends, so a move along one end draws nothing new. */
const sameEnds = (one: Scrolled | undefined, other: Scrolled): boolean =>
  one !== undefined &&
  one.x.start === other.x.start &&
  one.x.end === other.x.end &&
  one.y.start === other.y.start &&
  one.y.end === other.y.end

/**
 * Hosts the scroll machine: the part's scroll view, handed over by its
 * `scrollerRef`, observed from the moment it is drawn. **The states change
 * only as an end is reached or left**, so a scroll draws again only then.
 * **`moves` is sent as the offset changes**, and `settles` once the part
 * comes to rest after a move, as the web sends `scroll` and `scrollend`.
 * The part shows the platform's scroll indicators, where the web draws its
 * own scrollbar. **Its frame is a stop of keyboard focus while it overflows,
 * and the keys scroll it**, as `useScrollKeys` says, with the host's
 * `focusVisible` while the frame shows the ring.
 */
export const useScrollState = (family: Family, props: Props, use: MachineUse): Behavior => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const moves = boundTo(use, 'moves', 'event')
  const settles = boundTo(use, 'settles', 'event')
  const [node, setNode] = useState<HostInstance | null>(null)
  const [standing, setStanding] = useState<Scrolled | undefined>(undefined)
  const latest = useRef(props)
  latest.current = props
  const scrollerRef = useCallback((next: HostInstance | null) => setNode(next), [])
  useEffect(() => {
    if (node === null) {
      return undefined
    }
    let last = standingOf(node)
    let moved = false
    setStanding(last)
    const send = (event: string | undefined) => {
      if (event !== undefined) {
        tell(family, latest.current, event, {})
      }
    }
    return scroll().observe(node, (at) => {
      const offsetChanged = at.offset.x !== last.offset.x || at.offset.y !== last.offset.y
      if (!sameEnds(last, at)) {
        setStanding(at)
      }
      last = at
      moved ||= offsetChanged
      if (offsetChanged) {
        send(moves)
      }
      if (at.settled && moved) {
        moved = false
        send(settles)
      }
    })
  }, [family, moves, node, settles])
  const keyed = useScrollKeys(node, overflowing(standing))
  return {
    marks: [],
    parts: {
      host: { states: { ...statesOf(use, standing), focusVisible: keyed.ringed } },
      [part]: { view: { ...keyed.view, indicators: true, scrollerRef } },
    },
  }
}
