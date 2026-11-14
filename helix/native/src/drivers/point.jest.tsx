import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { GestureDetector, GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { type Point, type Pointing, usePoint } from './point'

type Told = (string | Point)[]

const Box = ({ held, told, within }: { held: { at?: Pointing }; told: Told; within?: boolean }) => {
  const pointing = usePoint({
    ...(within === undefined ? {} : { accepts: () => within }),
    drag: (at) => told.push('drag', at),
    enabled: true,
    press: (at) => told.push('press', at),
    release: () => told.push('release'),
  })
  held.at = pointing
  return (
    <GestureDetector gesture={pointing.gesture}>
      <View onLayout={pointing.measure} testID="box" />
    </GestureDetector>
  )
}

const laidOut = async (held: { at?: Pointing }, told: Told, within?: boolean) => {
  await render(
    <GestureHandlerRootView>
      <Box held={held} told={told} {...(within === undefined ? {} : { within })} />
    </GestureHandlerRootView>,
  )
  await act(async () => {
    fireEvent(screen.getByTestId('box'), 'layout', {
      nativeEvent: { layout: { height: 100, width: 200, x: 0, y: 0 } },
    })
  })
}

const gestures = (held: { at?: Pointing }) =>
  ((held.at as Pointing).gesture as unknown as { gestures: readonly unknown[] }).gestures

describe('usePoint', () => {
  test('a press reports the point and the box', async () => {
    const held: { at?: Pointing } = {}
    const told: Told = []
    await laidOut(held, told)
    await act(async () => {
      fireGestureHandler(gestures(held)[1] as never, [
        { state: State.BEGAN, x: 50, y: 25 },
        { state: State.ACTIVE, x: 50, y: 25 },
        { state: State.END, x: 50, y: 25 },
      ])
    })
    expect(told).toEqual(['press', { height: 100, width: 200, x: 50, y: 25 }, 'release'])
  })

  test('a drag starts where the finger went down, and moves along both axes', async () => {
    const held: { at?: Pointing } = {}
    const told: Told = []
    await laidOut(held, told)
    await act(async () => {
      fireGestureHandler(gestures(held)[0] as never, [
        { state: State.BEGAN, translationX: 0, translationY: 0, x: 10, y: 10 },
        { state: State.ACTIVE, translationX: 20, translationY: 30, x: 30, y: 40 },
        { state: State.ACTIVE, translationX: 40, translationY: 50, x: 50, y: 60 },
        { state: State.END, translationX: 40, translationY: 50, x: 50, y: 60 },
      ])
    })
    const size = { height: 100, width: 200 }
    expect(told.slice(0, 2)).toEqual(['press', { ...size, x: 10, y: 10 }])
    expect(told).toContainEqual({ ...size, x: 50, y: 60 })
    expect(told.at(-1)).toBe('release')
  })

  test('a touch the box does not accept is told nothing', async () => {
    const held: { at?: Pointing } = {}
    const told: Told = []
    await laidOut(held, told, false)
    await act(async () => {
      fireGestureHandler(gestures(held)[1] as never, [
        { state: State.BEGAN, x: 50, y: 25 },
        { state: State.ACTIVE, x: 50, y: 25 },
        { state: State.END, x: 50, y: 25 },
      ])
    })
    expect(told).toEqual([])
  })
})
