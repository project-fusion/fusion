/**
 * The keys a part that scrolls takes from a hardware keyboard, and the stop
 * it is in the order of keyboard focus, as a browser scrolls a box that
 * overflows.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useEffect, useState } from 'react'
import { type HostInstance, TextInput } from 'react-native'
import { useFocusVisible } from '../capabilities/focus-visible'
import { lengthsOf, standingOf } from '../capabilities/scroll'

/** How far an arrow key scrolls, in points, as a browser's line step is 40 pixels. */
export const LINE = 40

/** How much of the frame a page key scrolls, as Chromium keeps an eighth of the last page in view. */
export const PAGE = 0.875

/** A point along each axis. */
interface Point {
  readonly x: number
  readonly y: number
}

/**
 * Where a key scrolls a part standing at `at`, with content and frame
 * `lengths`, or `undefined` for a key it does not take: the arrows by a line,
 * Page Up, Page Down and Space by most of the frame, and Home and End to
 * each end. Home and End go along the axis that scrolls down, and across in
 * a part that scrolls across alone. A key that moves nothing is not taken.
 */
export const scrolledBy = (
  pressed: Pick<KeyPress, 'key' | 'shift'>,
  at: Point,
  lengths: {
    readonly content: { readonly height: number; readonly width: number }
    readonly frame: { readonly height: number; readonly width: number }
  },
): Point | undefined => {
  const most = {
    x: Math.max(0, lengths.content.width - lengths.frame.width),
    y: Math.max(0, lengths.content.height - lengths.frame.height),
  }
  /* The axis a page key, Home, and End move along. */
  const down = most.y > 0
  const page = (down ? lengths.frame.height : lengths.frame.width) * PAGE
  const along = (by: number): Point =>
    down ? { x: at.x, y: at.y + by } : { x: at.x + by, y: at.y }
  const targets: Readonly<Record<string, Point>> = {
    ' ': along(pressed.shift ? -page : page),
    ArrowDown: { x: at.x, y: at.y + LINE },
    ArrowLeft: { x: at.x - LINE, y: at.y },
    ArrowRight: { x: at.x + LINE, y: at.y },
    ArrowUp: { x: at.x, y: at.y - LINE },
    End: down ? { x: at.x, y: most.y } : { x: most.x, y: at.y },
    Home: down ? { x: at.x, y: 0 } : { x: 0, y: at.y },
    PageDown: along(page),
    PageUp: along(-page),
  }
  const target = targets[pressed.key]
  if (target === undefined) {
    return undefined
  }
  const to = {
    x: Math.min(most.x, Math.max(0, target.x)),
    y: Math.min(most.y, Math.max(0, target.y)),
  }
  return to.x === at.x && to.y === at.y ? undefined : to
}

/** What a part that scrolls lays over its frame, and whether its ring shows. */
export interface ScrollKeys {
  /** Whether the frame shows the focus ring, as `:focus-visible` on the web. */
  readonly ringed: boolean
  /** The frame's props: a stop in the order of keyboard focus while it overflows, and its ref. */
  readonly view: {
    readonly focusable: boolean
    readonly ref: (node: HostInstance | null) => void
  }
}

/**
 * Hosts the keys of the part `scroller` is the scroll view of: **the frame
 * around it is a stop of keyboard focus while it overflows**, as a browser
 * makes a box that overflows one, since a scroll view takes no focus of its
 * own. **The keys scroll it while focus is on the frame or a view inside
 * it**, unless a view nearer the focus took the key, a text field has focus,
 * a modifier is held, or the part already stands at that end, which leaves
 * the key to a part that scrolls around it.
 */
export const useScrollKeys = (scroller: HostInstance | null, overflows: boolean): ScrollKeys => {
  const [frame, setFrame] = useState<HostInstance | null>(null)
  const ref = useCallback((node: HostInstance | null) => setFrame(node), [])
  useEffect(() => {
    if (frame === null || scroller === null) {
      return undefined
    }
    return keys().listen(frame, (pressed) => {
      if (
        pressed.claimed ||
        pressed.alt ||
        pressed.control ||
        pressed.meta ||
        TextInput.State.currentlyFocusedInput() != null
      ) {
        return false
      }
      const to = scrolledBy(pressed, standingOf(scroller).offset, lengthsOf(scroller))
      if (to === undefined) {
        return false
      }
      scroll().to(scroller, to.x, to.y, false)
      return true
    })
  }, [frame, scroller])
  const ringed = useFocusVisible(() => frame)
  return { ringed, view: { focusable: overflows, ref } }
}
