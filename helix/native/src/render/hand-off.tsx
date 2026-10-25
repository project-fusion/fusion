/**
 * What a scroll view does inside a layer that swipes along its axis: hands
 * the layer its drag at its start, as `useSwipe` says. Its gesture runs
 * beside the layer's swipe, and the swipe reads where it stands and holds it
 * there.
 */
import { type ReactNode, type RefObject, useCallback } from 'react'
import type { ScrollViewInstance } from 'react-native'
/** What a scroll view's scroll event tells of where it stands, along both axes. */
export interface Scrolled {
  readonly content: { readonly height: number; readonly width: number }
  readonly frame: { readonly height: number; readonly width: number }
  readonly offset: { readonly x: number; readonly y: number }
}

import { GestureDetector } from 'react-native-gesture-handler'
import { useSwipeScroller } from './layered'

/** What a scroll view along `axis` takes from the swiping layer around it. */
export interface HandOff {
  /** The ref the scroll view takes, which holds its own and the swipe's. */
  readonly held: (node: ScrollViewInstance | null) => void
  /**
   * Hears where the scroll view stands, in points past its start, and how
   * long its content and its frame are, as its scroll events tell them.
   */
  readonly scrolled: (at: Scrolled) => void
  /** Draws the scroll view inside the gesture the swipe runs beside, where it hands off. */
  readonly wrap: (view: ReactNode) => ReactNode
}

/**
 * The hand-off of a scroll view along `axis`, or along neither, whose own ref
 * is `own`. Outside a layer that swipes along the same axis, it holds the
 * ref alone and draws the view as it is.
 */
export const useHandOff = (
  axis: 'x' | 'y' | undefined,
  own: (node: ScrollViewInstance | null) => void,
): HandOff => {
  const swipe = useSwipeScroller()
  const handing = swipe !== undefined && axis !== undefined && swipe.axis === axis
  const held = useCallback(
    (node: ScrollViewInstance | null) => {
      own(node)
      /* Reanimated's animated ref is a ref callback, and its Jest mock an object. */
      const ref = swipe?.ref as unknown
      if (handing && typeof ref === 'function') {
        ;(ref as (node: ScrollViewInstance | null) => void)(node)
      } else if (handing && typeof ref === 'object' && ref !== null) {
        ;(ref as { current: ScrollViewInstance | null }).current = node
      }
    },
    [handing, own, swipe],
  )
  return {
    held,
    scrolled: ({ content, frame, offset }) => {
      if (handing) {
        const x = axis === 'x'
        swipe.scrolled(
          x ? offset.x : offset.y,
          x ? content.width : content.height,
          x ? frame.width : frame.height,
        )
      }
    },
    wrap: (view) =>
      handing ? <GestureDetector gesture={swipe.gesture}>{view}</GestureDetector> : view,
  }
}

/** A ref callback that writes `ref`, as a scroll view's own ref is held. */
export const holding =
  (ref: RefObject<ScrollViewInstance | null>) =>
  (node: ScrollViewInstance | null): void => {
    ref.current = node
  }
