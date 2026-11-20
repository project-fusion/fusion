import {
  type Scroll,
  type ScrollLengths,
  scrolledAt,
} from '@fusion.dev/helix-core/capabilities/scroll'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Point, Scrolled, Stop } from '@fusion.dev/helix-core/capabilities/types'
import type { HostInstance, ScrollViewInstance } from 'react-native'

/** The offset each scroll view's `onScroll` last reported. */
const offsets = new WeakMap<HostInstance, Point>()

/** The layers holding the screen still. A layer that locks twice is one holder. */
const holders = new Set<HostInstance>()

/** What `observeScrollLock` calls when the screen is held or let go. */
const lockObservers = new Set<(locked: boolean) => void>()

/** What `observeScrolled` calls as each scroll view reports a new offset. */
const scrollObservers = new WeakMap<HostInstance, Set<(at: Point) => void>>()

/** How long each scroll view's content and frame are, as it last reported them. */
const lengths = new WeakMap<HostInstance, ScrollLengths>()

/** What `observe` calls as each scroll view moves and comes to rest. */
const standingObservers = new WeakMap<HostInstance, Set<(scrolled: Scrolled) => void>>()

/** The quiet wait of each scroll view that has moved and not yet come to rest. */
const resting = new WeakMap<HostInstance, Stop>()

/** The scroll views gliding on after a finger let go, whose glide ends their scroll. */
const gliding = new WeakSet<HostInstance>()

/**
 * How long a scroll view goes without moving before it has come to rest,
 * where nothing says it has: a drag let go with no glide, or a scroll by
 * `to` or `by`. The web's `scrollend` waits about as long.
 */
export const QUIET_MS = 100

const NONE: ScrollLengths = { content: { height: 0, width: 0 }, frame: { height: 0, width: 0 } }

/** Tells each observer of `node` where it stands. */
const tellStanding = (node: HostInstance, settled: boolean): void => {
  const heard = standingObservers.get(node)
  if (heard === undefined || heard.size === 0) {
    return
  }
  const standing = scrolledAt(offset(node), lengths.get(node) ?? NONE, settled)
  for (const one of [...heard]) {
    one(standing)
  }
}

/**
 * Says a scroll view has come to rest, and tells its observers. A glide's
 * end calls it from `onMomentumScrollEnd`; otherwise the quiet wait after the
 * last move does.
 */
export const settled = (node: HostInstance): void => {
  resting.get(node)?.()
  resting.delete(node)
  gliding.delete(node)
  tellStanding(node, true)
}

/** Says a scroll view glides on after a finger let go, so its rest is the glide's end. */
export const glides = (node: HostInstance): void => {
  gliding.add(node)
  resting.get(node)?.()
  resting.delete(node)
}

/**
 * Records how far a scroll view is scrolled, and tells its observers. The
 * adapter's scroll views call it from `onScroll`, with the event's
 * `contentOffset`. **It has come to rest once it goes `QUIET_MS` without
 * moving**, unless it glides, where the glide's end says so.
 */
export const scrolled = (node: HostInstance, point: Point): void => {
  offsets.set(node, { x: point.x, y: point.y })
  for (const one of [...(scrollObservers.get(node) ?? [])]) {
    one({ x: point.x, y: point.y })
  }
  tellStanding(node, false)
  if (!gliding.has(node)) {
    resting.get(node)?.()
    resting.set(
      node,
      timers().timeout(QUIET_MS, () => settled(node)),
    )
  }
}

/**
 * Records how long a scroll view's content or frame is, along either axis or
 * both, which where it stands is read against.
 */
export const sizedScroll = (
  node: HostInstance,
  which: keyof ScrollLengths,
  size: { readonly height?: number; readonly width?: number },
): void => {
  const was = lengths.get(node) ?? NONE
  const next = { ...was, [which]: { ...was[which], ...size } }
  lengths.set(node, next)
  /* A change of length can move an end, as content that grows puts more
     past the bottom, so its observers hear where it stands. */
  if (JSON.stringify(next) !== JSON.stringify(was)) {
    tellStanding(node, false)
  }
}

/** How long a scroll view's content and frame are, as it last reported them. */
export const lengthsOf = (node: HostInstance): ScrollLengths => lengths.get(node) ?? NONE

/** Where a scroll view stands now, from what it last reported. */
export const standingOf = (node: HostInstance): Scrolled =>
  scrolledAt(offset(node), lengths.get(node) ?? NONE, false)

/** The scroll view that scrolls across inside each one that scrolls down, for a part that scrolls both ways. */
const across = new WeakMap<HostInstance, ScrollViewInstance>()

/** The scroll view that scrolls down around each one paired across inside it. */
const around = new WeakMap<HostInstance, ScrollViewInstance>()

/**
 * Pairs the scroll view `inner`, which scrolls across, with `outer`, which
 * scrolls down around it, so a part that scrolls both ways is one node: its
 * offset and lengths are both views', and `to` and `by` move both. `null`
 * takes the pair apart.
 */
export const pairAcross = (outer: HostInstance, inner: ScrollViewInstance | null): void => {
  const was = across.get(outer)
  if (was !== undefined) {
    around.delete(was)
  }
  if (inner === null) {
    across.delete(outer)
  } else {
    across.set(outer, inner)
    if (isScrollView(outer)) {
      around.set(inner, outer)
    }
  }
}

/** Scrolls `node` to `x` and `y`, the view across inside it to `x` where it has one. */
const scrollTo = (node: ScrollViewInstance, x: number, y: number, animated: boolean): void => {
  const inner = across.get(node)
  if (inner === undefined) {
    node.scrollTo({ animated, x, y })
    return
  }
  inner.scrollTo({ animated, x, y: 0 })
  node.scrollTo({ animated, x: 0, y })
}

/**
 * Calls `changed` with the offset each time the scroll view `node` reports
 * one through `scrolled`, until stopped. A set whose items a drag hears in
 * screen coordinates hears them again once the page scrolls them.
 */
export const observeScrolled = (node: HostInstance, changed: (at: Point) => void): Stop => {
  const heard = scrollObservers.get(node) ?? new Set()
  scrollObservers.set(node, heard)
  /* Its own function, so the same `changed` observed twice is two observers. */
  const one = (at: Point): void => changed(at)
  heard.add(one)
  return () => {
    heard.delete(one)
  }
}

/** Whether a layer holds the screen still. */
export const scrollLocked = (): boolean => holders.size > 0

/**
 * Calls `changed` each time the screen is held or let go, until stopped. The
 * adapter's scroll views read it into their `scrollEnabled`, and an app can
 * read it into its own.
 */
export const observeScrollLock = (changed: (locked: boolean) => void): Stop => {
  const one = (locked: boolean): void => changed(locked)
  lockObservers.add(one)
  return () => {
    lockObservers.delete(one)
  }
}

const tell = (locked: boolean): void => {
  for (const one of [...lockObservers]) {
    one(locked)
  }
}

const offset = (node: HostInstance): Point => {
  const at = offsets.get(node)
  return at ? { ...at } : { x: 0, y: 0 }
}

/** Whether `node` is a scroll view: a host instance that `ScrollView` gave its methods. */
const isScrollView = (node: HostInstance): node is ScrollViewInstance =>
  typeof (node as Partial<ScrollViewInstance>).scrollTo === 'function'

/**
 * The nearest scroll view above `node`, or `null`. **Inside a part that
 * scrolls both ways it is the part's outer scroll view**, which the scroll
 * capability takes as the part, with the offset and the lengths of both: the
 * view across inside it reports nothing of its own.
 *
 * **Every element above a host instance is a host instance too.** React Native
 * types `parentElement` as `ReadOnlyElement`, the class `ReactNativeElement`
 * extends, so the walk casts it.
 */
export const scrollViewAbove = (node: HostInstance): ScrollViewInstance | null => {
  let up = node.parentElement as HostInstance | null
  while (up) {
    if (isScrollView(up)) {
      return around.get(up) ?? up
    }
    up = up.parentElement as HostInstance | null
  }
  return null
}

/**
 * Holds every scroll view above `node` still until the stop is called, as
 * `touch-action: none` keeps a browser from scrolling under a touch. A
 * programmatic scroll still moves them.
 */
export const holdScrollViewsAbove = (node: HostInstance): (() => void) => {
  const held: ScrollViewInstance[] = []
  let up = node.parentElement as HostInstance | null
  while (up) {
    if (isScrollView(up)) {
      held.push(up)
      up.setNativeProps({ scrollEnabled: false })
    }
    up = up.parentElement as HostInstance | null
  }
  return () => {
    for (const view of held) {
      view.setNativeProps({ scrollEnabled: true })
    }
  }
}

/**
 * How far to scroll along one axis to show a part: back to its start where it
 * begins before the view, on to its end where it runs past it, and nowhere
 * where it is inside. A part longer than the view shows its start.
 */
const along = (start: number, size: number, viewStart: number, viewSize: number): number => {
  if (start < viewStart) {
    return start - viewStart
  }
  return Math.max(0, start + size - (viewStart + viewSize))
}

/**
 * Scrolls a scroll view with its `scrollTo`, reveals a part in the nearest
 * scroll view above it, reads the offset its `onScroll` last reported through
 * `scrolled`, and holds the screen through a registry the adapter reads.
 *
 * **`observe` tells where a scroll view stands** from what the adapter's
 * scroll views report: the offset, and the lengths of the content and the
 * frame through `sizedScroll`. A scroll view that scrolls along one axis
 * stands at both ends of the other.
 *
 * **A scroll view whose `onScroll` does not reach `scrolled` reads as
 * unscrolled**, so `by` and `reveal` move it from its start.
 *
 * **`lock` keeps a registry.** A capability cannot set the props of a scroll
 * view it does not draw, and the scroll view behind a layer, such as one in a
 * `Modal`, is not among the layer's ancestors, so the layer leads to no
 * scroll view. `setNativeProps` would turn scrolling off outside React's
 * props, where the scroll view's own renders would not turn it back on. The
 * adapter's scroll views pass `!scrollLocked()` as `scrollEnabled` and hear
 * changes through `observeScrollLock`.
 */
export const nativeScroll: Scroll<HostInstance> = {
  /* From the offset `onScroll` last reported. Recording each target ahead of
     the report would drift: a step past the end is clamped by the platform
     and reports no scroll, so the recorded offset would run on past the end,
     and the next step back would not move. */
  by: (node, x, y) => {
    if (!isScrollView(node)) {
      return
    }
    const at = offset(node)
    scrollTo(node, at.x + x, at.y + y, false)
  },
  /* A stop lets go once, so a stop kept from an earlier lock cannot let go of
     a later one, as on the web. */
  lock: (node) => {
    const was = scrollLocked()
    holders.add(node)
    if (!was) {
      tell(true)
    }
    let held = true
    return () => {
      if (!held) {
        return
      }
      held = false
      if (holders.delete(node) && holders.size === 0) {
        tell(false)
      }
    }
  },
  observe: (node, changed) => {
    const heard = standingObservers.get(node) ?? new Set()
    standingObservers.set(node, heard)
    /* Its own function, so the same `changed` observed twice is two observers. */
    const one = (standing: Scrolled): void => changed(standing)
    heard.add(one)
    return () => {
      heard.delete(one)
    }
  },
  offset,
  /* Measured from the two rectangles, both in the viewport's coordinates, so
     the difference between them is where the part sits in the scroll view
     whatever lies between. */
  reveal: (node) => {
    const view = scrollViewAbove(node)
    if (!view) {
      return
    }
    const part = node.getBoundingClientRect()
    const frame = view.getBoundingClientRect()
    const x = along(part.x, part.width, frame.x, frame.width)
    const y = along(part.y, part.height, frame.y, frame.height)
    if (x === 0 && y === 0) {
      return
    }
    const at = offset(view)
    scrollTo(view, at.x + x, at.y + y, false)
  },
  to: (node, x, y, smooth) => {
    if (isScrollView(node)) {
      scrollTo(node, x, y, smooth)
    }
  },
}
