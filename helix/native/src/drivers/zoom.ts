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
 * tap, and at each `zoomTo`, `panBy`, and `reset`, as the web says its
 * scale once a reader stops zooming.
 *
 * **Shaped for every surface that pans and zooms**, as a lightbox's item, and
 * a canvas, a graph, and a map after it: the box is measured by `measure`,
 * the style goes on what it shows, and the gesture goes around the box. A
 * one-finger drag at the item's own size is not a pan, and is handed to
 * `swiped`, as a lightbox reads it as a swipe to the next item.
 */

import {
  clampPan,
  clampScale,
  doublePressed,
  dragged,
  fromMiddle,
  type Offset,
  panRoom,
  pinched,
  type Zoom,
  type ZoomStart,
  zoomAt,
  zoomedBy,
} from '@fusion.dev/helix-core/zoom'
import { useCallback, useEffect, useMemo, useRef } from 'react'
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
import { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

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

/** What the gestures' worklets read and write on the UI thread. */
interface Shared {
  readonly from: SharedValue<ZoomStart>
  readonly height: SharedValue<number>
  /** The item's size at a scale of 1, 0 for the box's own. */
  readonly itemHeight: SharedValue<number>
  readonly itemWidth: SharedValue<number>
  readonly max: SharedValue<number>
  readonly min: SharedValue<number>
  /** Whether two fingers have been down since this touch began, which makes it no swipe. */
  readonly pinching: SharedValue<boolean>
  readonly scale: SharedValue<number>
  readonly width: SharedValue<number>
  readonly x: SharedValue<number>
  readonly y: SharedValue<number>
}

/** How far the item may move either way at `scale`. */
const roomAt = (shared: Shared, scale: number): Offset => {
  'worklet'
  const width = shared.width.value
  const height = shared.height.value
  return panRoom(
    scale,
    width,
    height,
    shared.itemWidth.value || width,
    shared.itemHeight.value || height,
  )
}

/** Whether one finger moves the item at `scale`, which it does wherever there is room. */
const movable = (shared: Shared, scale: number): boolean => {
  'worklet'
  const room = roomAt(shared, scale)
  return room.x > 0 || room.y > 0
}

/** Writes `zoom`, its pan held to the box, and gives whether anything moved. */
const write = (shared: Shared, zoom: Zoom): boolean => {
  'worklet'
  const width = shared.width.value
  const height = shared.height.value
  const pan = clampPan(
    zoom.pan,
    zoom.scale,
    width,
    height,
    shared.itemWidth.value || width,
    shared.itemHeight.value || height,
  )
  const moved =
    zoom.scale !== shared.scale.value || pan.x !== shared.x.value || pan.y !== shared.y.value
  shared.scale.value = zoom.scale
  shared.x.value = pan.x
  shared.y.value = pan.y
  return moved
}

/** Where the zoom stands now, as a gesture starts from it. */
const startAt = (shared: Shared, at: Offset, apart: number): ZoomStart => {
  'worklet'
  return {
    at,
    pan: { x: shared.x.value, y: shared.y.value },
    scale: shared.scale.value,
    spread: apart,
  }
}

/** A point the box measures from its top left corner, from its middle. */
const middled = (shared: Shared, x: number, y: number): Offset => {
  'worklet'
  return fromMiddle(x, y, shared.width.value, shared.height.value)
}

/** The shared values the gestures read, made once. */
const useShared = (setup: ZoomSetup): Shared => {
  const { item, max } = setup
  const min = setup.min ?? 1
  const from = useSharedValue<ZoomStart>({
    at: { x: 0, y: 0 },
    pan: { x: 0, y: 0 },
    scale: 1,
    spread: 0,
  })
  const height = useSharedValue(0)
  const itemHeight = useSharedValue(item?.height ?? 0)
  const itemWidth = useSharedValue(item?.width ?? 0)
  const most = useSharedValue(max)
  const least = useSharedValue(min)
  const pinching = useSharedValue(false)
  const scale = useSharedValue(1)
  const width = useSharedValue(0)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  /* Written after the render, as Reanimated asks of a shared value. */
  useEffect(() => {
    most.value = max
    least.value = min
    itemWidth.value = item?.width ?? 0
    itemHeight.value = item?.height ?? 0
  }, [item?.height, item?.width, itemHeight, itemWidth, least, max, min, most])
  return useMemo(
    () => ({
      from,
      height,
      itemHeight,
      itemWidth,
      max: most,
      min: least,
      pinching,
      scale,
      width,
      x,
      y,
    }),
    [from, height, itemHeight, itemWidth, least, most, pinching, scale, width, x, y],
  )
}

/** Makes a surface's pan and pinch. */
export const useZoom = (setup: ZoomSetup): Zooming => {
  const shared = useShared(setup)
  const latest = useRef(setup)
  latest.current = setup
  const zooms = setup.enabled && setup.max > (setup.min ?? 1)
  const step = setup.doubleStep ?? 0
  const tell = useCallback((zoom: Zoom) => latest.current.changed?.(zoom), [])
  const stir = useCallback(() => latest.current.touched?.(), [])
  const swipe = useCallback(
    (dx: number, dy: number, vx: number) => latest.current.swiped?.(dx, dy, vx),
    [],
  )
  const tap = useCallback((at: Offset) => latest.current.tapped?.(at), [])
  const zoom = useCallback(
    (): Zoom => ({ pan: { x: shared.x.value, y: shared.y.value }, scale: shared.scale.value }),
    [shared],
  )
  /* A change from the JavaScript thread, told once it stands. */
  const set = useCallback(
    (next: Zoom) => {
      if (write(shared, next)) {
        tell(zoom())
      }
    },
    [shared, tell, zoom],
  )
  const zoomTo = useCallback(
    (to: number, at: Offset = { x: 0, y: 0 }) => {
      const scale = clampScale(to, shared.max.value, shared.min.value)
      set({ pan: zoomAt(at, shared.scale.value, scale, zoom().pan), scale })
    },
    [set, shared, zoom],
  )
  const panBy = useCallback(
    (by: Offset): boolean => {
      const before = zoom()
      if (!movable(shared, before.scale)) {
        return false
      }
      set({ pan: { x: before.pan.x + by.x, y: before.pan.y + by.y }, scale: before.scale })
      const after = zoom().pan
      return after.x !== before.pan.x || after.y !== before.pan.y
    },
    [set, shared, zoom],
  )
  const reset = useCallback(() => set({ pan: { x: 0, y: 0 }, scale: 1 }), [set])
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout
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
    reset,
    scale: shared.scale,
    style,
    x: shared.x,
    y: shared.y,
    zoom,
    zoomTo,
  }
}
