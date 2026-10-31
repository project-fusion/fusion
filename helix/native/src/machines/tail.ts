/**
 * The follow-tail machine an element that declares a `tail` runs: a box that
 * keeps its newest content in view until the reader scrolls away, and a way back.
 * Log binds it, and Chat can: it knows nothing of what the box holds.
 *
 * **It reads core's `follow-tail`**, the arithmetic the web's Log reads, so a
 * scroll means the same on both platforms: a scroll the box made, and the box
 * growing under a reader who has not moved, are not the reader leaving.
 *
 * **It hears where the box stands from whatever draws it**, through `moved`, and
 * moves it through `held`: a list, or a scroll view. `maintainVisibleContentPosition`
 * holds a reader's place where content goes from above what they read.
 */
import { atTail, type TailStanding, tailTurn } from '@fusion.dev/helix-core/follow-tail'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'

/** What can move a box to its end: a list or a scroll view. */
export interface TailBox {
  readonly scrollToEnd?: (to: { animated?: boolean }) => void
}

/** What an element's other machines read of the tail. */
export interface Tail {
  /** Whether the box follows its newest content. */
  readonly following: boolean
  /** Takes the box that scrolls. */
  readonly held: (box: TailBox | null) => void
  /** Stops following, where a reader was sent elsewhere in the box. */
  readonly letGo: () => void
  /** What holds a reader's place as content above them goes. */
  readonly maintainVisibleContentPosition: { readonly minIndexForVisible: number }
  /** Hears where the box stands. */
  readonly moved: (offset: number, frame: number, content: number) => void
  /** Goes back to the newest content, and follows it again. */
  readonly resume: () => void
  /** Goes to the newest content, where the box is following it. */
  readonly stick: () => void
}

/** Holds a reader's place from the first row on, as content above them goes. */
const HOLD = { minIndexForVisible: 0 }

/** Where a box stands before anything has said. */
const NOWHERE: TailStanding = { content: 0, frame: 0, offset: 0 }

/**
 * Hosts the tail: whether the box follows, which a reader's scrolling asks to
 * change through `before-pin`, and a press on its way back.
 */
export const useTail = (
  family: Family,
  props: Props,
  use: MachineUse,
): { readonly behavior: Behavior; readonly tail: Tail } => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const asked = read('pinned') as boolean | undefined
  const [own, setOwn] = useState<boolean | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(asked)
  }
  const following = own ?? asked ?? read('defaultPinned') !== false
  const threshold = Number(read('threshold') ?? 48)
  const box = useRef<TailBox | null>(null)
  const standing = useRef<TailStanding>(NOWHERE)
  const stuckAt = useRef(-1)
  const now = useRef({ following, props, threshold })
  now.current = { following, props, threshold }

  const stick = useCallback(() => {
    box.current?.scrollToEnd?.({ animated: false })
  }, [])

  const ask = useCallback(
    (next: boolean): boolean => {
      if (next === now.current.following) {
        return false
      }
      const before = boundTo(use, 'onBeforePin', 'event')
      const value = String(next)
      if (before !== undefined && !tell(family, now.current.props, before, { value })) {
        return false
      }
      now.current = { ...now.current, following: next }
      setOwn(next)
      const after = boundTo(use, 'onPin', 'event')
      if (after !== undefined) {
        tell(family, now.current.props, after, { value })
      }
      return true
    },
    [family, use],
  )

  const moved = useCallback(
    (offset: number, frame: number, content: number) => {
      const at = { content, frame, offset }
      standing.current = at
      const latest = now.current
      const turn = tailTurn(at, latest.following, stuckAt.current, latest.threshold)
      if (turn === 'stay' && latest.following) {
        /* Where the box stands at its end is the offset a reader has not moved from. */
        stuckAt.current = offset
      } else if (turn === 'stick') {
        stick()
      } else if (turn !== 'stay' && frame > 0) {
        ask(turn === 'follow')
      }
    },
    [ask, stick],
  )

  const resume = useCallback(() => {
    /* Where the box stood before is no offset to hold it to on its way back. */
    stuckAt.current = -1
    stick()
    ask(true)
  }, [ask, stick])

  const letGo = useCallback(() => {
    ask(false)
  }, [ask])

  const held = useCallback(
    (next: TailBox | null) => {
      box.current = next
      if (next !== null && now.current.following) {
        stick()
      }
    },
    [stick],
  )

  /* Coming back to following by a prop goes to the end, as the web's update does. */
  useLayoutEffect(() => {
    if (following && !atTail(standing.current, 0)) {
      stuckAt.current = -1
      stick()
    }
  }, [following, stick])

  const away = boundTo(use, 'away', 'state')
  const follows = boundTo(use, 'following', 'state')
  const resumes = boundTo(use, 'resume', 'part')
  return {
    behavior: {
      marks: following ? ['pinned'] : [],
      parts: {
        host: {
          states: {
            ...(away === undefined ? {} : { [away]: !following }),
            ...(follows === undefined ? {} : { [follows]: following }),
          },
        },
        ...(resumes === undefined ? {} : { [resumes]: { view: { onPress: resume } } }),
      },
    },
    tail: {
      following,
      held,
      letGo,
      maintainVisibleContentPosition: HOLD,
      moved,
      resume,
      stick,
    },
  }
}
