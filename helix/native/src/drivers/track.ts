/**
 * A drag along a track, as a slider is moved: a press on the track takes
 * the value to the point pressed, and a drag along it moves the value with
 * the finger. Each reports where it stands as a fraction of the track, 0 at
 * its start and 1 at its end: from the left, from the right on a
 * right-to-left page, and from the foot on a track that stands on end, as
 * the web's range reads a pointer.
 *
 * **A drag across the track is the page's**, so a slider in a scrolling
 * page leaves a scroll to the page, as a finger on the web's range does:
 * the drag starts once the finger travels `TRACK_SLOP` along the track, and
 * fails once it travels that far across it first.
 *
 * **The value is asked for on the JavaScript thread**, since each move asks
 * before it stands, so the thumb follows at the pace React draws it.
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

/** How far a finger travels along the track before a press is a drag, in points. */
export const TRACK_SLOP = 4

/**
 * Where a point `at` points into a track `length` points long stands, as a
 * fraction of it from its start, held to 0 and 1: along a horizontal track,
 * from the left or from the right on a right-to-left page, and up a track
 * on end, from its foot.
 */
export const fractionAlong = (
  at: { readonly x: number; readonly y: number },
  length: number,
  way: { readonly rtl: boolean; readonly vertical: boolean },
): number => {
  if (!(length > 0)) {
    return 0
  }
  const from = way.vertical ? length - at.y : way.rtl ? length - at.x : at.x
  return Math.min(1, Math.max(0, from / length))
}

/**
 * Where a press becomes a drag: once it travels the slop along the track,
 * and never once it travels the slop across it first.
 */
const alongOf = (vertical: boolean) => {
  const slop: [number, number] = [-TRACK_SLOP, TRACK_SLOP]
  return vertical
    ? { activeOffsetY: slop, failOffsetX: slop }
    : { activeOffsetX: slop, failOffsetY: slop }
}

/** What a drag along a track reads of the track it moves along. */
export interface TrackSetup {
  /** Whether a touch moves the value now. */
  readonly enabled: boolean
  /** Whether the page reads right to left, which puts the track's start at the right. */
  readonly rtl: boolean
  /** Whether the track stands on end, its start at the foot. */
  readonly vertical: boolean
  /** Told where a press, or the start of a drag, stands. */
  readonly press: (fraction: number) => void
  /** Told where a drag stands as it moves. */
  readonly drag: (fraction: number) => void
  /** Told that the press or the drag is done. */
  readonly release: () => void
}

/** What a track draws with. */
export interface Tracking {
  /** The drag and the press, which go around the track in a `GestureDetector`. */
  readonly gesture: ComposedGesture
  /** Measures the track along its axis, as its `onLayout`. */
  readonly measure: (event: LayoutChangeEvent) => void
}

/** Makes a track's drag and press. */
export const useTrack = (setup: TrackSetup): Tracking => {
  const size = useRef({ height: 0, width: 0 })
  const latest = useRef(setup)
  latest.current = setup
  const held = useRef(false)
  const measure = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    size.current = { height, width }
  }, [])
  /** Where a point in the track stands, as a fraction of it. */
  const fraction = useCallback((at: { readonly x: number; readonly y: number }): number => {
    const { rtl, vertical } = latest.current
    const { height, width } = size.current
    return fractionAlong(at, vertical ? height : width, { rtl, vertical })
  }, [])
  const pan = usePanGesture(
    useMemo(
      () => ({
        ...alongOf(setup.vertical),
        enabled: setup.enabled,
        /* The drag starts where the finger went down, as a press on the
           track takes the value there first. */
        onActivate: (event: PanGestureActiveEvent) => {
          held.current = true
          latest.current.press(
            fraction({ x: event.x - event.translationX, y: event.y - event.translationY }),
          )
          latest.current.drag(fraction(event))
        },
        onFinalize: () => {
          if (held.current) {
            held.current = false
            latest.current.release()
          }
        },
        onUpdate: (event: PanGestureActiveEvent) => {
          if (held.current) {
            latest.current.drag(fraction(event))
          }
        },
        runOnJS: true,
      }),
      [setup.enabled, setup.vertical, fraction],
    ),
  )
  const tap = useTapGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        onActivate: (event: TapGestureActiveEvent) => {
          latest.current.press(fraction(event))
          latest.current.release()
        },
        runOnJS: true,
      }),
      [setup.enabled, fraction],
    ),
  )
  const gesture = useExclusiveGestures(pan, tap)
  return { gesture, measure }
}
