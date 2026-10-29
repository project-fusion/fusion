import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { GestureDetector, GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { fractionAlong, type Tracking, useTrack } from './track'

describe('fractionAlong', () => {
  test('reads a point from the start of the track, held to its ends', () => {
    const way = { rtl: false, vertical: false }
    expect(fractionAlong({ x: 50, y: 7 }, 200, way)).toBe(0.25)
    expect(fractionAlong({ x: -20, y: 7 }, 200, way)).toBe(0)
    expect(fractionAlong({ x: 260, y: 7 }, 200, way)).toBe(1)
  })

  test('reads from the right on a right-to-left page, and from the foot on end', () => {
    expect(fractionAlong({ x: 50, y: 0 }, 200, { rtl: true, vertical: false })).toBe(0.75)
    expect(fractionAlong({ x: 0, y: 50 }, 200, { rtl: false, vertical: true })).toBe(0.75)
  })

  test('reads nothing along a track not yet measured', () => {
    expect(fractionAlong({ x: 50, y: 0 }, 0, { rtl: false, vertical: false })).toBe(0)
  })
})

/** What a track told, in order. */
type Told = (string | number)[]

const Track = ({ held, told }: { held: { tracking?: Tracking }; told: Told }) => {
  const tracking = useTrack({
    drag: (fraction) => told.push('drag', fraction),
    enabled: true,
    press: (fraction) => told.push('press', fraction),
    release: () => told.push('release'),
    rtl: false,
    vertical: false,
  })
  held.tracking = tracking
  return (
    <GestureDetector gesture={tracking.gesture}>
      <View onLayout={tracking.measure} testID="track" />
    </GestureDetector>
  )
}

const drawn = async () => {
  const held: { tracking?: Tracking } = {}
  const told: Told = []
  await render(
    <GestureHandlerRootView>
      <Track held={held} told={told} />
    </GestureHandlerRootView>,
  )
  await act(async () => {
    fireEvent(screen.getByTestId('track'), 'layout', {
      nativeEvent: { layout: { height: 24, width: 200, x: 0, y: 0 } },
    })
  })
  return { held, told }
}

/** One of the two gestures the track holds, by its place. */
const gestureOf = (tracking: Tracking | undefined, at: number): never => {
  const { gestures } = (tracking?.gesture ?? { gestures: [] }) as unknown as {
    readonly gestures: readonly unknown[]
  }
  return gestures[at] as never
}

/** The pan the track drags with, the first of its two gestures. */
const panOf = (tracking: Tracking | undefined): never => gestureOf(tracking, 0)

/** The press the track jumps with, the second of its two gestures. */
const tapOf = (tracking: Tracking | undefined): never => gestureOf(tracking, 1)

describe('useTrack', () => {
  test('starts a drag where the finger went down, follows it, and lets go', async () => {
    const { held, told } = await drawn()
    await act(async () => {
      fireGestureHandler(panOf(held.tracking), [
        { state: State.BEGAN, translationX: 0, x: 40, y: 12 },
        { state: State.ACTIVE, translationX: 10, x: 50, y: 12 },
        { translationX: 60, x: 100, y: 12 },
        { state: State.END, translationX: 60, x: 100, y: 12 },
      ])
    })
    expect(told).toEqual(['press', 0.2, 'drag', 0.25, 'drag', 0.5, 'release'])
  })

  test('takes a press on the track to the point pressed', async () => {
    const { held, told } = await drawn()
    await act(async () => {
      fireGestureHandler(tapOf(held.tracking), [
        { state: State.BEGAN, x: 150, y: 12 },
        { state: State.ACTIVE, x: 150, y: 12 },
        { state: State.END, x: 150, y: 12 },
      ])
    })
    expect(told).toEqual(['press', 0.75, 'release'])
  })
})
