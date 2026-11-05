import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { GestureDetector, GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { useZoom, type Zooming } from './zoom'

/** Where a spec keeps what the box draws with, and what it was told. */
interface Held {
  readonly told: unknown[]
  zooming?: Zooming
}

const Box = ({ held, max }: { readonly held: Held; readonly max: number }) => {
  const zooming = useZoom({
    changed: (zoom) => held.told.push(['changed', zoom]),
    enabled: true,
    max,
    swiped: (dx, dy, vx) => held.told.push(['swiped', dx, dy, vx]),
    tapped: (at) => held.told.push(['tapped', at]),
    touched: () => held.told.push(['touched']),
  })
  held.zooming = zooming
  return (
    <GestureDetector gesture={zooming.gesture}>
      <View onLayout={zooming.measure} testID="box" />
    </GestureDetector>
  )
}

/** A box 400 points wide and 300 tall, zoomable to `max`. */
const drawn = async (max = 3): Promise<Held> => {
  const held: Held = { told: [] }
  await render(
    <GestureHandlerRootView>
      <Box held={held} max={max} />
    </GestureHandlerRootView>,
  )
  await act(async () => {
    fireEvent(screen.getByTestId('box'), 'layout', {
      nativeEvent: { layout: { height: 300, width: 400, x: 0, y: 0 } },
    })
  })
  return held
}

/** Lets a change reach the JavaScript thread, which `scheduleOnRN` in worklets' mock queues. */
const settle = () => act(() => new Promise<void>((done) => setTimeout(done, 0)))

/** The pinch, the drag, the double tap, and the single tap, in that order. */
const parts = (held: Held) => {
  const composed = held.zooming?.gesture as unknown as { gestures: readonly unknown[] }
  const [pinch, pan, taps] = composed.gestures as [unknown, unknown, { gestures: unknown[] }]
  const [double, single] = taps.gestures
  return { double, pan, pinch, single }
}

const zoomOf = (held: Held) => held.zooming?.zoom()

describe('useZoom', () => {
  test('two fingers spread to twice as far apart double the scale about the point between them', async () => {
    const held = await drawn()
    fireGestureHandler(parts(held).pinch as never, [
      { focalX: 300, focalY: 150, scale: 1, state: State.BEGAN },
      { focalX: 300, focalY: 150, scale: 1, state: State.ACTIVE },
      { focalX: 300, focalY: 150, scale: 2 },
      { focalX: 300, focalY: 150, scale: 2, state: State.END },
    ])
    await settle()
    /* The point 100 right of the middle stays where it was: 100 + -100 = 2 * 100 - 100. */
    expect(zoomOf(held)).toEqual({ pan: { x: -100, y: 0 }, scale: 2 })
    expect(held.told).toContainEqual(['changed', { pan: { x: -100, y: 0 }, scale: 2 }])
  })

  test('a pinch grows no further than the most it may', async () => {
    const held = await drawn(3)
    fireGestureHandler(parts(held).pinch as never, [
      { focalX: 200, focalY: 150, scale: 1, state: State.BEGAN },
      { focalX: 200, focalY: 150, scale: 1, state: State.ACTIVE },
      { focalX: 200, focalY: 150, scale: 8 },
      { focalX: 200, focalY: 150, scale: 8, state: State.END },
    ])
    expect(zoomOf(held)?.scale).toBe(3)
  })

  test('a double tap zooms all the way in about the point, and a second back out', async () => {
    const held = await drawn(3)
    const tap = [
      { state: State.BEGAN, x: 250, y: 130 },
      { state: State.ACTIVE, x: 250, y: 130 },
      { state: State.END, x: 250, y: 130 },
    ]
    fireGestureHandler(parts(held).double as never, tap)
    expect(zoomOf(held)).toEqual({ pan: { x: -100, y: 40 }, scale: 3 })
    fireGestureHandler(parts(held).double as never, tap)
    expect(zoomOf(held)).toEqual({ pan: { x: 0, y: 0 }, scale: 1 })
  })

  test('one finger drags a zoomed item, never so far that an edge comes inside the box', async () => {
    const held = await drawn(3)
    await act(async () => held.zooming?.zoomTo(2))
    fireGestureHandler(parts(held).pan as never, [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 40, translationY: 0 },
      { translationX: 900, translationY: -20 },
      { state: State.END, translationX: 900, translationY: -20 },
    ])
    await settle()
    /* At a scale of 2 in a box 400 wide, 200 either way. */
    expect(zoomOf(held)).toEqual({ pan: { x: 200, y: -20 }, scale: 2 })
    expect(held.told.some((one) => (one as unknown[])[0] === 'swiped')).toBe(false)
  })

  test('a drag at the item’s own size is told as a swipe and moves nothing', async () => {
    const held = await drawn(3)
    fireGestureHandler(parts(held).pan as never, [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: -40, translationY: 0 },
      { translationX: -160, translationY: 5, velocityX: -600 },
      { state: State.END, translationX: -160, translationY: 5, velocityX: -600 },
    ])
    await settle()
    expect(zoomOf(held)).toEqual({ pan: { x: 0, y: 0 }, scale: 1 })
    expect(held.told).toContainEqual(['touched'])
    expect(held.told).toContainEqual(['swiped', -160, 5, -0.6])
  })

  test('zooms, pans, and resets from the JavaScript thread, telling each change', async () => {
    const held = await drawn(3)
    await act(async () => held.zooming?.zoomTo(1.5))
    expect(zoomOf(held)?.scale).toBe(1.5)
    await act(async () => {
      expect(held.zooming?.panBy({ x: -500, y: 0 })).toBe(true)
    })
    expect(zoomOf(held)?.pan).toEqual({ x: -100, y: 0 })
    await act(async () => held.zooming?.reset())
    expect(zoomOf(held)).toEqual({ pan: { x: 0, y: 0 }, scale: 1 })
    await act(async () => {
      expect(held.zooming?.panBy({ x: 10, y: 0 })).toBe(false)
    })
    expect(held.told.filter((one) => (one as unknown[])[0] === 'changed')).toHaveLength(3)
  })

  test('a single tap is told where it landed, from the middle of the box', async () => {
    const held = await drawn(1)
    fireGestureHandler(parts(held).single as never, [
      { state: State.BEGAN, x: 20, y: 20 },
      { state: State.ACTIVE, x: 20, y: 20 },
      { state: State.END, x: 20, y: 20 },
    ])
    await settle()
    expect(held.told).toContainEqual(['tapped', { x: -180, y: -130 }])
  })
})
