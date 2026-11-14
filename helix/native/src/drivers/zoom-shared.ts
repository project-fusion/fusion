/**
 * The pan and pinch driver's shared values, made once, and the worklets that
 * read and write them on the UI thread under the finger: how far the item may
 * move, a zoom written held to the box, where a gesture starts from, and a
 * point measured from the middle of the box.
 */

import {
  fromMiddle,
  type Offset,
  panRoom,
  type Zoom,
  type ZoomStart,
} from '@fusion.dev/helix-core/zoom'
import { useEffect, useMemo } from 'react'
import { type SharedValue, useSharedValue } from 'react-native-reanimated'
import type { ZoomSetup } from './zoom'

/** What the gestures' worklets read and write on the UI thread. */
export interface Shared {
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
  /** The share of the box the item may move past where its edges meet the box's. */
  readonly slack: SharedValue<number>
  readonly width: SharedValue<number>
  readonly x: SharedValue<number>
  readonly y: SharedValue<number>
}

/** How far the item may move either way at `scale`, its slack past the edges included. */
export const roomAt = (shared: Shared, scale: number): Offset => {
  'worklet'
  const width = shared.width.value
  const height = shared.height.value
  const room = panRoom(
    scale,
    width,
    height,
    shared.itemWidth.value || width,
    shared.itemHeight.value || height,
  )
  return { x: room.x + shared.slack.value * width, y: room.y + shared.slack.value * height }
}

/** Whether one finger moves the item at `scale`, which it does wherever there is room. */
export const movable = (shared: Shared, scale: number): boolean => {
  'worklet'
  const room = roomAt(shared, scale)
  return room.x > 0 || room.y > 0
}

/** Writes `zoom`, its pan held to the box, and gives whether anything moved. */
export const write = (shared: Shared, zoom: Zoom): boolean => {
  'worklet'
  const room = roomAt(shared, zoom.scale)
  const pan = {
    x: Math.min(Math.max(zoom.pan.x, -room.x), room.x) || 0,
    y: Math.min(Math.max(zoom.pan.y, -room.y), room.y) || 0,
  }
  const moved =
    zoom.scale !== shared.scale.value || pan.x !== shared.x.value || pan.y !== shared.y.value
  shared.scale.value = zoom.scale
  shared.x.value = pan.x
  shared.y.value = pan.y
  return moved
}

/** Where the zoom stands now, as a gesture starts from it. */
export const startAt = (shared: Shared, at: Offset, apart: number): ZoomStart => {
  'worklet'
  return {
    at,
    pan: { x: shared.x.value, y: shared.y.value },
    scale: shared.scale.value,
    spread: apart,
  }
}

/** A point the box measures from its top left corner, from its middle. */
export const middled = (shared: Shared, x: number, y: number): Offset => {
  'worklet'
  return fromMiddle(x, y, shared.width.value, shared.height.value)
}

/** The shared values the gestures read, made once. */
export const useShared = (setup: ZoomSetup): Shared => {
  const { item, max } = setup
  const min = setup.min ?? 1
  const slackBy = setup.slack ?? 0
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
  const slack = useSharedValue(slackBy)
  const width = useSharedValue(0)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  /* Written after the render, as Reanimated asks of a shared value. */
  useEffect(() => {
    most.value = max
    least.value = min
    itemWidth.value = item?.width ?? 0
    itemHeight.value = item?.height ?? 0
    slack.value = slackBy
  }, [item?.height, item?.width, itemHeight, itemWidth, least, max, min, most, slack, slackBy])
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
      slack,
      width,
      x,
      y,
    }),
    [from, height, itemHeight, itemWidth, least, most, pinching, scale, slack, width, x, y],
  )
}
