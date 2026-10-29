/**
 * A drag that resizes, as a splitter's divider is moved: the finger takes
 * hold of a thin handle and carries it along one axis, and each move
 * reports how far the finger has traveled from where it went down, in
 * points, toward the end of the axis: rightward, leftward on a
 * right-to-left page, and downward along an axis on end. A double tap puts
 * the handle back where it started, as a double click does on the web.
 *
 * **A drag across the axis is the page's**, so a divider in a scrolling
 * page leaves a scroll to the page: the drag starts once the finger
 * travels `TRACK_SLOP` along the axis, and fails once it travels that far
 * across it first.
 *
 * **The travel is reported on the JavaScript thread**, since a resize asks
 * before it stands, so the handle follows at the pace React draws it.
 */

import { useMemo, useRef } from 'react'
import {
  type ComposedGesture,
  type PanGestureActiveEvent,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler'
import { TRACK_SLOP } from './track'

/**
 * How far a drag has traveled toward the end of its axis, in points, from
 * its translation: across a horizontal axis, mirrored on a right-to-left
 * page, and down an axis on end.
 */
export const travelOf = (
  moved: { readonly translationX: number; readonly translationY: number },
  way: { readonly rtl: boolean; readonly vertical: boolean },
): number =>
  way.vertical ? moved.translationY : way.rtl ? -moved.translationX : moved.translationX

/** What a resizing drag reads of the handle it moves. */
export interface ResizeSetup {
  /** Whether a touch moves the handle now. */
  readonly enabled: boolean
  /** Whether the page reads right to left, which puts the axis's start at the right. */
  readonly rtl: boolean
  /** Whether the axis stands on end, its start at the top. */
  readonly vertical: boolean
  /** Told that a drag has taken hold of the handle. */
  readonly press: () => void
  /** Told how far the drag has traveled toward the end, in points, as it moves. */
  readonly drag: (travel: number) => void
  /** Told that the drag is done. */
  readonly release: () => void
  /** Told that the handle was tapped twice, to put it back. */
  readonly reset: () => void
}

/** Makes a resizing drag and its double tap, which go around the handle in a `GestureDetector`. */
export const useResize = (setup: ResizeSetup): ComposedGesture => {
  const latest = useRef(setup)
  latest.current = setup
  const held = useRef(false)
  const pan = usePanGesture(
    useMemo(
      () => ({
        ...(setup.vertical
          ? {
              activeOffsetY: [-TRACK_SLOP, TRACK_SLOP] as [number, number],
              failOffsetX: [-TRACK_SLOP, TRACK_SLOP] as [number, number],
            }
          : {
              activeOffsetX: [-TRACK_SLOP, TRACK_SLOP] as [number, number],
              failOffsetY: [-TRACK_SLOP, TRACK_SLOP] as [number, number],
            }),
        enabled: setup.enabled,
        onActivate: (event: PanGestureActiveEvent) => {
          held.current = true
          latest.current.press()
          latest.current.drag(travelOf(event, latest.current))
        },
        onFinalize: () => {
          if (held.current) {
            held.current = false
            latest.current.release()
          }
        },
        onUpdate: (event: PanGestureActiveEvent) => {
          if (held.current) {
            latest.current.drag(travelOf(event, latest.current))
          }
        },
        runOnJS: true,
      }),
      [setup.enabled, setup.vertical],
    ),
  )
  const twice = useTapGesture(
    useMemo(
      () => ({
        enabled: setup.enabled,
        numberOfTaps: 2,
        onActivate: () => {
          latest.current.reset()
        },
        runOnJS: true,
      }),
      [setup.enabled],
    ),
  )
  return useExclusiveGestures(pan, twice)
}
