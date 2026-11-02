/**
 * A swipe that moves a surface toward the edge of the window it stands
 * along, rests it at a snap point, or takes it out through that edge, as a
 * drawer and a sheet are swiped. The surface follows the finger on the UI
 * thread, and only the release reaches the JavaScript thread, where core's
 * `settleSwipe` says where it rests, as the web's drawer settles it.
 *
 * **A drag inside a scroller in the surface is the scroller's until the
 * scroller can go no further**, as a sheet on iOS hands its list's drag to
 * itself and as core's `handsOver` says for the web's drawer too: a drag
 * toward the edge moves the surface once the scroller stands at the end that
 * drag scrolls it toward, its start for a surface along the bottom, and has
 * stood still for `SCROLL_LOCK`, so a list flung to its top carries no
 * surface with it. A drag away from the edge moves it while it rests short of
 * the whole. While the surface moves, the scroller is held where it stands.
 */

import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import {
  parseSnapPoints,
  SCROLL_LOCK,
  type SwipeEdge,
  settleSwipe,
  snapTravel,
  swipeAxis,
} from '@fusion.dev/helix-core/swipe'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import {
  type NativeGesture,
  type PanGesture,
  type PanGestureActiveEvent,
  useNativeGesture,
  usePanGesture,
} from 'react-native-gesture-handler'
import {
  type AnimatedRef,
  ReduceMotion,
  type SharedValue,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { reducedNow } from '../render/motion'
import { CURVES } from './motion'

/** How far a press travels along the axis before it is a swipe, in points, as the web's `SwipeController` waits. */
export const SWIPE_SLOP = 8

/** How long a released surface takes to come to rest, in milliseconds: the web drawer's `duration-normal`. */
const SETTLE = 200

/** How far a move of `x` and `y` went toward `edge`, negative where it went away. */
export const towardEdge = (edge: SwipeEdge, x: number, y: number): number => {
  'worklet'
  return edge === 'bottom' ? y : edge === 'top' ? -y : edge === 'right' ? x : -x
}

/** Where the surface stands after a move, and whether the surface took it from the scroller. */
export interface Step {
  readonly takes: boolean
  readonly travel: number
}

/** Where a scroller a touch began inside stands, as a swipe reads it. */
export interface Held {
  /** How far it can still scroll the way a drag toward the edge scrolls it, in points. */
  readonly room: number
  /** Whether it has stood still for `SCROLL_LOCK`. */
  readonly still: boolean
}

/**
 * Where a surface `travel` points toward its edge stands after a move of
 * `delta` toward it, from a touch that began inside a scroller that stands
 * as `held` says, or outside every scroller. **The surface takes a move
 * toward the edge once the scroller can scroll no further that way and has
 * stood still, and a move away while it rests short of the whole**, as core's
 * `handsOver` says. Any other move is the scroller's. The surface never
 * moves past the whole, as the web's does not.
 */
export const stepped = (travel: number, delta: number, held: Held | undefined): Step => {
  'worklet'
  const takes = held === undefined || (delta > 0 ? held.room <= 0 && held.still : travel > 0)
  return { takes, travel: takes ? Math.max(0, travel + delta) : travel }
}

/** What a swipe reads of the surface it moves. */
export interface SwipeSetup {
  /** The physical edge the surface stands along and leaves through. */
  readonly edge: SwipeEdge
  /** Whether a touch swipes the surface now. */
  readonly enabled: boolean
  /** Whether the surface stands open, which rests it at its smallest snap point. */
  readonly open: boolean
  /** The snap points, as the web's `snap-points` writes them, `0.5 1`. */
  readonly points: unknown
  /**
   * Told where a release comes to rest: a share of the surface on screen,
   * or 0 to dismiss it, which gives whether the dismissal stands.
   */
  readonly settle: (shown: number) => boolean
}

/** What a scroller inside a swiping surface takes, so the swipe hears its drag and holds it still. */
export interface SwipeScroller {
  /** The axis the swipe runs along, which a scroller along the other axis leaves alone. */
  readonly axis: 'x' | 'y'
  /** The scroller's own gesture, which goes around it in a `GestureDetector`. */
  readonly gesture: NativeGesture
  /** The ref the scroller's view takes, which the swipe holds it where it stands through. */
  readonly ref: AnimatedRef<never>
  /**
   * Hears where the scroller stands along the axis, in points past its
   * start, with how long its content and its frame are along it.
   */
  readonly scrolled: (offset: number, content: number, frame: number) => void
}

/** What a swiping surface draws with. */
export interface Swiping {
  /** The pan, which goes around the surface in a `GestureDetector`. */
  readonly gesture: PanGesture
  /** Measures the surface along the axis, as its `onLayout`. */
  readonly measure: (event: LayoutChangeEvent) => void
  /** What a scroller inside the surface takes. */
  readonly scroller: SwipeScroller
  /** The share of the surface on screen at the snap point it rests at. */
  readonly shown: number
  /** Glides the surface to rest at its largest snap point, as a control past the window's edge takes focus. */
  readonly whole: () => void
  /** The animated style that moves the surface toward its edge. */
  readonly style: ReturnType<typeof useAnimatedStyle>
}

/** What the pan's worklets read and write on the UI thread. */
interface Shared {
  readonly edge: SharedValue<SwipeEdge>
  readonly enabled: SharedValue<boolean>
  /** Whether the touch began inside a scroller along the axis. */
  readonly inside: SharedValue<boolean>
  /** Whether the surface moved during this touch, which makes its release a swipe. */
  readonly moved: SharedValue<boolean>
  /** When the scroller last moved on its own, in milliseconds of the wall clock. */
  readonly scrolledAt: SharedValue<number>
  /** How far the scroller stands past its start. */
  readonly scrolled: SharedValue<number>
  /** How far past its start the scroller stands at its end. */
  readonly end: SharedValue<number>
  /** How far the surface stands toward its edge from the whole, in points. */
  readonly travel: SharedValue<number>
}

/** Where the scroller a touch began inside stands for the swipe, read on the UI thread. */
const heldOf = (shared: Shared): Held => {
  'worklet'
  const edge = shared.edge.value
  const toStart = edge === 'bottom' || edge === 'right'
  return {
    room: toStart ? shared.scrolled.value : Math.max(0, shared.end.value - shared.scrolled.value),
    still: Date.now() - shared.scrolledAt.value >= SCROLL_LOCK,
  }
}

/** Moves the surface by one update of the pan, and holds the scroller where it stands while it does. */
const follow = (
  shared: Shared,
  scroller: AnimatedRef<never>,
  across: boolean,
  event: PanGestureActiveEvent,
) => {
  'worklet'
  const delta = towardEdge(shared.edge.value, event.changeX, event.changeY)
  const step = stepped(shared.travel.value, delta, shared.inside.value ? heldOf(shared) : undefined)
  if (!step.takes) {
    return
  }
  shared.travel.value = step.travel
  shared.moved.value = true
  if (shared.inside.value) {
    /* At the end a drag toward the edge scrolls it to, which is its start
       along the bottom or the right, and where it stands otherwise. */
    const edge = shared.edge.value
    const at = edge === 'bottom' || edge === 'right' ? 0 : shared.end.value
    const hold = delta > 0 ? at : shared.scrolled.value
    scrollTo(scroller, across ? hold : 0, across ? 0 : hold, false)
    shared.scrolled.value = hold
  }
}

/**
 * Makes a surface's swipe. **The surface opens at its smallest snap point**,
 * as the web's drawer does, once it is measured, and a release rests it at
 * the point `settleSwipe` gives, or asks `settle` to dismiss it, and goes
 * back to where it rested where the dismissal is refused.
 */
export const useSwipe = (setup: SwipeSetup): Swiping => {
  const points = useMemo(
    () => parseSnapPoints(typeof setup.points === 'string' ? setup.points : undefined),
    [setup.points],
  )
  const edge = useSharedValue<SwipeEdge>(setup.edge)
  const enabled = useSharedValue(setup.enabled)
  const inside = useSharedValue(false)
  const moved = useSharedValue(false)
  const scrolled = useSharedValue(0)
  const scrolledAt = useSharedValue(0)
  const end = useSharedValue(0)
  const travel = useSharedValue(0)
  const [shared] = useState<Shared>(() => ({
    edge,
    enabled,
    end,
    inside,
    moved,
    scrolled,
    scrolledAt,
    travel,
  }))
  edge.value = setup.edge
  enabled.value = setup.enabled && setup.open
  const scrollerRef = useAnimatedRef<never>()
  const size = useRef(0)
  const rest = useRef(0)
  const [shown, setShown] = useState(points[0] ?? 1)
  const latest = useRef({ open: setup.open, points, settle: setup.settle })
  latest.current = { open: setup.open, points, settle: setup.settle }

  /* Glides the surface to `to` points toward its edge, at once under reduced motion. */
  const glide = useCallback(
    (to: number) => {
      travel.value = reducedNow()
        ? to
        : withTiming(to, {
            duration: SETTLE,
            easing: CURVES.decelerate,
            reduceMotion: ReduceMotion.Never,
          })
    },
    [travel],
  )
  /* Rests the surface at the snap point that shows `share` of it. */
  const restAt = useCallback(
    (share: number, at: 'glide' | 'once') => {
      rest.current = snapTravel(size.current, share)
      setShown(share)
      if (at === 'once') {
        travel.value = rest.current
      } else {
        glide(rest.current)
      }
    },
    [glide, travel],
  )
  const release = useCallback(
    (left: number, velocity: number) => {
      const share = settleSwipe({
        points: latest.current.points,
        size: size.current,
        travel: left,
        velocity,
      })
      /* **A dismissal its element refused leaves the surface open**, as a
         `closes` handler that cancels does, and it goes back to where it
         rested a frame later, once the refusal has been drawn. */
      if (share === 0) {
        if (!latest.current.settle(0)) {
          glide(rest.current)
          return
        }
        timers().frame(() => {
          if (latest.current.open) {
            glide(rest.current)
          }
        })
        return
      }
      restAt(share, 'glide')
      latest.current.settle(share)
    },
    [glide, restAt],
  )
  /* Opening rests it at its smallest snap point, as the web's does. */
  useEffect(() => {
    if (setup.open) {
      restAt(latest.current.points[0] ?? 1, 'once')
    }
  }, [restAt, setup.open])
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout
      const along = swipeAxis(setup.edge) === 'x' ? width : height
      if (along !== size.current) {
        size.current = along
        restAt(shown, 'once')
      }
    },
    [restAt, setup.edge, shown],
  )
  const scrollerGesture = useNativeGesture(
    useMemo(
      () => ({
        onBegin: () => {
          'worklet'
          inside.value = true
        },
      }),
      [inside],
    ),
  )
  const across = swipeAxis(setup.edge) === 'x'
  const gesture = usePanGesture(
    useMemo(
      () => ({
        enabled,
        /* A press is a swipe once it travels the slop along the axis, and a
           drag across it is left to the page, as the web's controller
           leaves it. */
        ...(across
          ? { activeOffsetX: [-SWIPE_SLOP, SWIPE_SLOP], failOffsetY: [-SWIPE_SLOP, SWIPE_SLOP] }
          : { activeOffsetY: [-SWIPE_SLOP, SWIPE_SLOP], failOffsetX: [-SWIPE_SLOP, SWIPE_SLOP] }),
        onBegin: () => {
          'worklet'
          moved.value = false
        },
        /* The release, with how fast the finger went toward the edge, in
           points a millisecond, as the web's controller measures it. */
        onDeactivate: (event: PanGestureActiveEvent) => {
          'worklet'
          if (moved.value) {
            scheduleOnRN(
              release,
              travel.value,
              towardEdge(edge.value, event.velocityX, event.velocityY) / 1000,
            )
          }
        },
        onFinalize: () => {
          'worklet'
          moved.value = false
          inside.value = false
        },
        onUpdate: (event: PanGestureActiveEvent) => {
          'worklet'
          follow(shared, scrollerRef, across, event)
        },
        simultaneousWith: scrollerGesture,
      }),
      [across, edge, enabled, inside, moved, release, scrollerGesture, scrollerRef, shared, travel],
    ),
  )
  const style = useAnimatedStyle(() => {
    const by = travel.value
    const way = edge.value
    return {
      transform: [
        { translateX: way === 'right' ? by : way === 'left' ? -by : 0 },
        { translateY: way === 'bottom' ? by : way === 'top' ? -by : 0 },
      ],
    }
  })
  const scroller = useMemo<SwipeScroller>(
    () => ({
      axis: across ? 'x' : 'y',
      gesture: scrollerGesture,
      ref: scrollerRef,
      scrolled: (offset: number, content: number, frame: number) => {
        /* **A move the swipe makes is no move of the scroller's own**, so
           holding it where it stands keeps the lock from starting. **Nor is
           iOS's bounce past an end**: a drag at the list's top bounced it, and
           the lock never let the sheet take that drag. */
        const last = Math.max(0, content - frame)
        const standing = Math.min(last, Math.max(0, offset))
        if (Math.abs(standing - scrolled.value) > 0.5 && !moved.value) {
          scrolledAt.value = Date.now()
        }
        scrolled.value = standing
        end.value = last
      },
    }),
    [across, end, moved, scrolled, scrolledAt, scrollerGesture, scrollerRef],
  )
  const whole = useCallback(() => restAt(latest.current.points.at(-1) ?? 1, 'glide'), [restAt])
  return { gesture, measure, scroller, shown, style, whole }
}
