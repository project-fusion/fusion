/**
 * Pan and pinch on the UI thread: two fingers scale what a box shows about
 * the point between them and move it with them, a double tap zooms all the
 * way in about the point tapped and back out, and one finger drags it about
 * once it is zoomed, never so far that an edge comes inside the box. It is
 * the web's `ZoomController`, with the same numbers from core's `zoom`.
 *
 * **A board zooms out as well as in**: with a `min` below 1 the item shrinks
 * inside the box and stays inside it, and with an `item` size of its own, as
 * a canvas's plane has, one finger moves it whenever it is larger or smaller
 * than the box, at any scale. A `doubleStep` makes a double tap zoom in by
 * that step about the point, as a board's double click does on the web.
 *
 * **The scale and the pan are shared values**, written under the finger on
 * the UI thread and drawn by an animated style, so a pinch moves no React
 * state and draws nothing again until it ends. The JavaScript thread hears
 * each change once it stands: at the end of a pinch or a drag, at a double
 * tap, and at each `zoomTo`, `panBy`, `place`, and `reset`, as the web says
 * its scale once a reader stops zooming.
 *
 * **The JavaScript thread keeps the zoom as it stands**, from what it wrote
 * and what it heard, since a shared value it writes reaches the UI thread
 * later: a `zoomTo` and a `panBy` in a row build on each other, where the
 * second read back the scale from before the first.
 *
 * **Shaped for every surface that pans and zooms**, as a lightbox's item, and
 * a canvas, a graph, and a map after it: the box is measured by `measure`,
 * the style goes on what it shows, and the gesture goes around the box. A
 * one-finger drag at the item's own size is not a pan, and is handed to
 * `swiped`, as a lightbox reads it as a swipe to the next item.
 */

import {
  clampScale,
  doublePressed,
  dragged,
  type Offset,
  panRoom,
  pinched,
  type Zoom,
  zoomAt,
  zoomedBy,
} from '@fusion.dev/helix-core/zoom'
import { useCallback, useMemo, useRef } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import {
  type ComposedGesture,
  type PanGestureActiveEvent,
  type PinchGestureActiveEvent,
  type TapGestureActiveEvent,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler'
import { type SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { middled, movable, startAt, useShared, write } from './zoom-shared'

/** How far one finger travels before a press is a drag, in points, as the web's swipe waits. */
export const ZOOM_SLOP = 8

/** What a surface that pans and zooms reads. */
export interface ZoomSetup {
  /** Whether a touch pans, pinches, or swipes the surface now. */
  readonly enabled: boolean
  /** The most the item may grow, as a scale. `min` or less turns zooming off, and leaves the swipe. */
  readonly max: number
  /** The least the item may shrink to, as a scale: 1 where it is left out, below 1 for a board. */
  readonly min?: number
  /** The size of what the box shows at a scale of 1, in points: the box's own where it is left out. */
  readonly item?: { readonly width: number; readonly height: number }
  /** What a double tap zooms in by, about the point tapped: all the way in and back out where it is left out. */
  readonly doubleStep?: number
  /** Told the zoom once it stands, on the JavaScript thread. */
  readonly changed?: (zoom: Zoom) => void
  /** Told as a touch starts, on the JavaScript thread, as a viewer's chrome comes back. */
  readonly touched?: () => void
  /**
   * Told a one-finger drag across the item at its own size once it is let
   * go: how far it went across and down, and how fast across, in points a
   * millisecond. A drag that a second finger joined is a pinch, and is not told.
   */
  readonly swiped?: (dx: number, dy: number, vx: number) => void
  /** Told a single tap, measured from the middle of the box, where a double tap does not follow. */
  readonly tapped?: (at: Offset) => void
}

/** What a surface that pans and zooms draws with. */
export interface Zooming {
  /** The pinch, the drag, and the taps, which go around the box in a `GestureDetector`. */
  readonly gesture: ComposedGesture
  /** Measures the box, as its `onLayout`. */
  readonly measure: (event: LayoutChangeEvent) => void
  /** Moves the pan by `by`, held to the box, and gives whether it moved. Nothing where the item has no room to move. */
  readonly panBy: (by: Offset) => boolean
  /** Moves and scales to `zoom` at once, held to the range and the box. */
  readonly place: (zoom: Zoom) => void
  /** Back to the item at its own size, in the middle. */
  readonly reset: () => void
  /** The scale, 1 at rest, on the UI thread. */
  readonly scale: SharedValue<number>
  /** The animated style that moves and scales the item, from the middle of the box. */
  readonly style: ReturnType<typeof useAnimatedStyle>
  /** How far the item is moved across from the middle of the box, on the UI thread. */
  readonly x: SharedValue<number>
  /** How far the item is moved down from the middle of the box, on the UI thread. */
  readonly y: SharedValue<number>
  /** The zoom as it stands. */
  readonly zoom: () => Zoom
  /** Zooms to `scale`, held to the range, about `at`, the middle where it is left out. */
  readonly zoomTo: (scale: number, at?: Offset) => void
}

/** Makes a surface's pan and pinch. */
export const useZoom = (setup: ZoomSetup): Zooming => {
  const shared = useShared(setup)
  const latest = useRef(setup)
  latest.current = setup
  const zooms = setup.enabled && setup.max > (setup.min ?? 1)
  const step = setup.doubleStep ?? 0
  /* The zoom as it stands, and the box, as the JavaScript thread knows them. */
  const mirror = useRef({ height: 0, pan: { x: 0, y: 0 }, scale: 1, width: 0 })
  const tell = useCallback((zoom: Zoom) => {
    mirror.current = { ...mirror.current, pan: zoom.pan, scale: zoom.scale }
    latest.current.changed?.(zoom)
  }, [])
  const stir = useCallback(() => latest.current.touched?.(), [])
  const swipe = useCallback(
    (dx: number, dy: number, vx: number) => latest.current.swiped?.(dx, dy, vx),
    [],
  )
  const tap = useCallback((at: Offset) => latest.current.tapped?.(at), [])
  const zoom = useCallback(
    (): Zoom => ({ pan: mirror.current.pan, scale: mirror.current.scale }),
    [],
  )
  /* How far the item may move at `scale`, from the box and the item as the JavaScript thread knows them. */
  const room = useCallback((scale: number): Offset => {
    const { height, width } = mirror.current
    const item = latest.current.item
    return panRoom(scale, width, height, item?.width || width, item?.height || height)
  }, [])
  /* A change from the JavaScript thread, held to the range and the box, and told once it stands. */
  const set = useCallback(
    (next: Zoom) => {
      const scale = clampScale(next.scale, latest.current.max, latest.current.min ?? 1)
      const reach = room(scale)
      const pan = {
        x: Math.min(Math.max(next.pan.x, -reach.x), reach.x) || 0,
        y: Math.min(Math.max(next.pan.y, -reach.y), reach.y) || 0,
      }
      const was = mirror.current
      if (scale === was.scale && pan.x === was.pan.x && pan.y === was.pan.y) {
        return
      }
      mirror.current = { ...was, pan, scale }
      shared.scale.value = scale
      shared.x.value = pan.x
      shared.y.value = pan.y
      tell({ pan, scale })
    },
    [room, shared, tell],
  )
  const zoomTo = useCallback(
    (to: number, at: Offset = { x: 0, y: 0 }) => {
      const now = zoom()
      const scale = clampScale(to, latest.current.max, latest.current.min ?? 1)
      set({ pan: zoomAt(at, now.scale, scale, now.pan), scale })
    },
    [set, zoom],
  )
  const panBy = useCallback(
    (by: Offset): boolean => {
      const before = zoom()
      const reach = room(before.scale)
      if (reach.x === 0 && reach.y === 0) {
        return false
      }
      set({ pan: { x: before.pan.x + by.x, y: before.pan.y + by.y }, scale: before.scale })
      const after = zoom().pan
      return after.x !== before.pan.x || after.y !== before.pan.y
    },
    [room, set, zoom],
  )
  const reset = useCallback(() => set({ pan: { x: 0, y: 0 }, scale: 1 }), [set])
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout
      mirror.current = { ...mirror.current, height, width }
      shared.width.value = width
      shared.height.value = height
    },
    [shared],
  )
  const pinch = usePinchGesture(
    useMemo(
      () => ({
        enabled: zooms,
        onActivate: (event: PinchGestureActiveEvent) => {
          'worklet'
          shared.pinching.value = true
          shared.from.value = startAt(shared, middled(shared, event.focalX, event.focalY), 1)
        },
        onDeactivate: () => {
          'worklet'
          scheduleOnRN(tell, {
            pan: { x: shared.x.value, y: shared.y.value },
            scale: shared.scale.value,
          })
        },
        onUpdate: (event: PinchGestureActiveEvent) => {
          'worklet'
          const at = middled(shared, event.focalX, event.focalY)
          write(
            shared,
            pinched(shared.from.value, event.scale, at, shared.max.value, shared.min.value),
          )
        },
      }),
      [shared, tell, zooms],
    ),
  )
  const pan = usePanGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        maxPointers: 1,
        minDistance: ZOOM_SLOP,
        onActivate: () => {
          'worklet'
          /* From where the finger went down, so the drag takes its first points too. */
          shared.from.value = startAt(shared, { x: 0, y: 0 }, 0)
        },
        onBegin: () => {
          'worklet'
          shared.pinching.value = false
          scheduleOnRN(stir)
        },
        onDeactivate: (event: PanGestureActiveEvent) => {
          'worklet'
          if (shared.pinching.value) {
            return
          }
          if (movable(shared, shared.from.value.scale)) {
            scheduleOnRN(tell, {
              pan: { x: shared.x.value, y: shared.y.value },
              scale: shared.scale.value,
            })
            return
          }
          scheduleOnRN(swipe, event.translationX, event.translationY, event.velocityX / 1000)
        },
        onUpdate: (event: PanGestureActiveEvent) => {
          'worklet'
          if (shared.pinching.value || !movable(shared, shared.from.value.scale)) {
            return
          }
          const at = { x: event.translationX, y: event.translationY }
          write(shared, { pan: dragged(shared.from.value, at), scale: shared.scale.value })
        },
      }),
      [setup.enabled, shared, stir, swipe, tell],
    ),
  )
  const double = useTapGesture(
    useMemo(
      () => ({
        enabled: zooms,
        numberOfTaps: 2,
        onActivate: (event: TapGestureActiveEvent) => {
          'worklet'
          const now = { pan: { x: shared.x.value, y: shared.y.value }, scale: shared.scale.value }
          const at = middled(shared, event.x, event.y)
          const next =
            step > 0
              ? zoomedBy(now, at, step, shared.max.value, shared.min.value)
              : doublePressed(now, at, shared.max.value)
          if (write(shared, next)) {
            scheduleOnRN(tell, {
              pan: { x: shared.x.value, y: shared.y.value },
              scale: shared.scale.value,
            })
          }
        },
      }),
      [shared, step, tell, zooms],
    ),
  )
  const single = useTapGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        onActivate: (event: TapGestureActiveEvent) => {
          'worklet'
          scheduleOnRN(tap, middled(shared, event.x, event.y))
        },
      }),
      [setup.enabled, shared, tap],
    ),
  )
  const taps = useExclusiveGestures(double, single)
  const gesture = useSimultaneousGestures(pinch, pan, taps)
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shared.x.value },
      { translateY: shared.y.value },
      { scale: shared.scale.value },
    ],
  }))
  return {
    gesture,
    measure,
    panBy,
    place: set,
    reset,
    scale: shared.scale,
    style,
    x: shared.x,
    y: shared.y,
    zoom,
    zoomTo,
  }
}
