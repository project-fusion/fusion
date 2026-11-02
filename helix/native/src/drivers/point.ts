/**
 * A drag in two axes, as a color picker's square is moved: a press takes the
 * value to the point pressed, and a drag moves it with the finger, along both
 * axes at once. Each reports the point in the box it is drawn over and the
 * box's size, from its top left corner, which a right-to-left page does not
 * turn: what the point means is the machine's to say.
 *
 * **A drag in any direction is the box's**, as `touch-action: none` makes it
 * on the web, so a scrolling page keeps the finger only until it travels
 * `POINT_SLOP`. A press with no travel is a tap at that point.
 *
 * **The value is asked for on the JavaScript thread**, as a track's is, since
 * each move asks before it stands, so the mark follows at the pace React draws
 * it.
 */

import { useCallback, useMemo, useRef } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import {
  type ComposedGesture,
  type PanGestureActiveEvent,
  type TapGestureActiveEvent,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler'

/** How far a finger travels before a press is a drag, in points. */
export const POINT_SLOP = 4

/** A point in a box, from its top left corner, and the box's size. */
export interface Point {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** What a drag in two axes reads of the box it moves over. */
export interface PointSetup {
  /** Whether a touch at the point is this box's, where something inside it takes others. */
  readonly accepts?: (at: Point) => boolean
  /** Whether a touch moves the value now. */
  readonly enabled: boolean
  /** Told where a press, or the start of a drag, stands. */
  readonly press: (at: Point) => void
  /** Told where a drag stands as it moves. */
  readonly drag: (at: Point) => void
  /** Told that the press or the drag is done. */
  readonly release: () => void
}

/** What a box a finger drags over draws with. */
export interface Pointing {
  /** The drag and the press, which go around the box in a `GestureDetector`. */
  readonly gesture: ComposedGesture
  /** Measures the box, as its `onLayout`. */
  readonly measure: (event: LayoutChangeEvent) => void
}

/** Makes a box's drag and press in two axes. */
export const usePoint = (setup: PointSetup): Pointing => {
  const size = useRef({ height: 0, width: 0 })
  const latest = useRef(setup)
  latest.current = setup
  const held = useRef(false)
  const measure = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    size.current = { height, width }
  }, [])
  const pointAt = useCallback((x: number, y: number): Point => ({ ...size.current, x, y }), [])
  const pan = usePanGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        minDistance: POINT_SLOP,
        /* The drag starts where the finger went down, as a press there does. */
        onActivate: (event: PanGestureActiveEvent) => {
          const from = pointAt(event.x - event.translationX, event.y - event.translationY)
          if (latest.current.accepts?.(from) === false) {
            return
          }
          held.current = true
          latest.current.press(from)
          latest.current.drag(pointAt(event.x, event.y))
        },
        onFinalize: () => {
          if (held.current) {
            held.current = false
            latest.current.release()
          }
        },
        onUpdate: (event: PanGestureActiveEvent) => {
          if (held.current) {
            latest.current.drag(pointAt(event.x, event.y))
          }
        },
        runOnJS: true,
      }),
      [setup.enabled, pointAt],
    ),
  )
  const tap = useTapGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        onActivate: (event: TapGestureActiveEvent) => {
          const at = pointAt(event.x, event.y)
          if (latest.current.accepts?.(at) !== false) {
            latest.current.press(at)
            latest.current.release()
          }
        },
        runOnJS: true,
      }),
      [setup.enabled, pointAt],
    ),
  )
  const gesture = useExclusiveGestures(pan, tap)
  return { gesture, measure }
}
