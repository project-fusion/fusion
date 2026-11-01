import { SCROLL_LOCK } from '@fusion.dev/helix-core/swipe'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { GestureDetector, GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import Animated from 'react-native-reanimated'
import { type Swiping, stepped, towardEdge, useSwipe } from './swipe'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('towardEdge', () => {
  test('reads a move toward the edge the surface leaves through as positive', () => {
    expect(towardEdge('bottom', 0, 30)).toBe(30)
    expect(towardEdge('top', 0, 30)).toBe(-30)
    expect(towardEdge('right', 30, 0)).toBe(30)
    expect(towardEdge('left', 30, 0)).toBe(-30)
  })
})

describe('stepped', () => {
  test('moves a surface touched outside any scroller, never past the whole', () => {
    expect(stepped(0, 20, undefined)).toEqual({ takes: true, travel: 20 })
    expect(stepped(10, -30, undefined)).toEqual({ takes: true, travel: 0 })
  })

  test('takes a move toward the edge only once the scroller can scroll no further that way', () => {
    expect(stepped(0, 20, { room: 120, still: true })).toEqual({ takes: false, travel: 0 })
    expect(stepped(0, 20, { room: 0, still: true })).toEqual({ takes: true, travel: 20 })
  })

  test('leaves a move toward the edge to a scroller that moved within the scroll lock', () => {
    expect(stepped(0, 20, { room: 0, still: false })).toEqual({ takes: false, travel: 0 })
  })

  test('takes a move away from the edge while the surface rests short of the whole', () => {
    expect(stepped(200, -40, { room: 0, still: false })).toEqual({ takes: true, travel: 160 })
    expect(stepped(0, -40, { room: 0, still: true })).toEqual({ takes: false, travel: 0 })
  })
})

/** Where a spec keeps what the surface draws with, and what it was told. */
interface Held {
  settled: number[]
  swiping?: Swiping
}

/** A surface along the bottom edge, drawn with `useSwipe`, that dismisses unless `refuse` holds. */
const Surface = ({
  held,
  points,
  refuse = false,
}: {
  readonly held: Held
  readonly points?: string
  readonly refuse?: boolean
}) => {
  const swiping = useSwipe({
    edge: 'bottom',
    enabled: true,
    open: true,
    points,
    settle: (shown) => {
      held.settled.push(shown)
      return !refuse
    },
  })
  held.swiping = swiping
  return (
    <GestureDetector gesture={swiping.gesture}>
      <Animated.View onLayout={swiping.measure} style={swiping.style} testID="surface" />
    </GestureDetector>
  )
}

/** Draws a surface 400 points tall and hands back what it draws with. */
const drawn = async (points?: string, refuse = false) => {
  const held: Held = { settled: [] }
  await render(
    <GestureHandlerRootView>
      <Surface held={held} {...(points === undefined ? {} : { points })} refuse={refuse} />
    </GestureHandlerRootView>,
  )
  await act(async () => {
    fireEvent(screen.getByTestId('surface'), 'layout', {
      nativeEvent: { layout: { height: 400, width: 390, x: 0, y: 0 } },
    })
  })
  return held
}

/** Lets the release reach the JavaScript thread, which `scheduleOnRN` in worklets' mock queues. */
const settle = () => act(() => new Promise<void>((done) => setTimeout(done, 0)))

/** A drag down by `by` points in one move, let go at `speed` points a second. */
const drag = (held: Held, by: number, speed = 0) => {
  const gesture = held.swiping?.gesture
  if (gesture === undefined) {
    throw new Error('no surface was drawn')
  }
  fireGestureHandler(gesture, [
    { state: State.BEGAN, translationY: 0 },
    { changeY: 10, state: State.ACTIVE, translationY: 10 },
    { changeY: by - 10, translationY: by, velocityY: speed },
    { state: State.END, translationY: by, velocityY: speed },
  ])
}

describe('useSwipe', () => {
  test('dismisses a surface dragged more than halfway toward its edge', async () => {
    const held = await drawn()
    drag(held, 260)
    await settle()
    expect(held.settled).toEqual([0])
  })

  test('rests a surface dragged a little at the whole', async () => {
    const held = await drawn()
    drag(held, 80)
    await settle()
    expect(held.settled).toEqual([1])
  })

  test('dismisses a surface flung toward its edge, however short the drag', async () => {
    const held = await drawn()
    drag(held, 40, 900)
    await settle()
    expect(held.settled).toEqual([0])
  })

  test('opens at the smallest snap point and rests at the nearest', async () => {
    const held = await drawn('0.5 1')
    expect(held.swiping?.shown).toBe(0.5)
    /* From half open, 200 points toward the edge, a drag up of 180 rests it
       near the whole. */
    drag(held, -180)
    await settle()
    expect(held.settled).toEqual([1])
    expect(held.swiping?.shown).toBe(1)
  })

  test('hands a drag down inside a list to the surface once the list stands at its top and has stood still', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(10_000)
    const held = await drawn()
    const scroller = held.swiping?.scroller
    /* The list stands 120 points down: the drag is its own. */
    scroller?.scrolled(120, 900, 300)
    fireGestureHandler(scroller?.gesture as never, [{ state: State.BEGAN }])
    drag(held, 260)
    await settle()
    expect(held.settled).toEqual([])
    /* At its top, half a second after it last moved, the drag is the surface's. */
    scroller?.scrolled(0, 900, 300)
    now.mockReturnValue(10_000 + SCROLL_LOCK)
    fireGestureHandler(scroller?.gesture as never, [{ state: State.BEGAN }])
    drag(held, 260)
    await settle()
    expect(held.settled).toEqual([0])
  })

  test('leaves a drag down to a list that reached its top within the scroll lock, as momentum carries it there', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(20_000)
    const held = await drawn()
    const scroller = held.swiping?.scroller
    scroller?.scrolled(300, 900, 300)
    scroller?.scrolled(0, 900, 300)
    now.mockReturnValue(20_000 + SCROLL_LOCK - 100)
    fireGestureHandler(scroller?.gesture as never, [{ state: State.BEGAN }])
    drag(held, 260)
    await settle()
    expect(held.settled).toEqual([])
  })

  test("hands over a drag that bounces the list at its top, since iOS's bounce past an end is no move of the list's", async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(30_000)
    const held = await drawn()
    const scroller = held.swiping?.scroller
    scroller?.scrolled(0, 900, 300)
    now.mockReturnValue(30_000 + SCROLL_LOCK)
    fireGestureHandler(scroller?.gesture as never, [{ state: State.BEGAN }])
    scroller?.scrolled(-24, 900, 300)
    drag(held, 260)
    await settle()
    expect(held.settled).toEqual([0])
  })

  test('tells a refused dismissal, and the surface stays open', async () => {
    const held = await drawn(undefined, true)
    drag(held, 300)
    await settle()
    expect(held.settled).toEqual([0])
  })
})
