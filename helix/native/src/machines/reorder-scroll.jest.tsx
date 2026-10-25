/*
 * A list whose rows move, drawn in a scroll view and dragged through the
 * native gesture driver itself, so a spec holds what a phone tells: the
 * passes the pan counts on the UI thread, and the renders each frame costs.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { gesture, setGesture } from '@fusion.dev/helix-core/capabilities/gesture'
import { haptics, setHaptics } from '@fusion.dev/helix-core/capabilities/haptics'
import { type FakeHaptics, fakeHaptics } from '@fusion.dev/helix-core/capabilities/haptics/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type FakeMeasure, fakeMeasure } from '@fusion.dev/helix-core/capabilities/measure/fake'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { fakeMotion } from '@fusion.dev/helix-core/capabilities/motion/fake'
import { scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { type FakeScroll, fakeScroll } from '@fusion.dev/helix-core/capabilities/scroll/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { HostInstance } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  createGestureController,
  type GestureController,
} from 'react-native-gesture-handler/jest-utils'
import * as capability from '../capabilities/measure'
import { scrolled } from '../capabilities/scroll'
import { nativeGesture } from '../drivers/gesture'
import type { Props, UseBehavior } from '../render/behavior'
import { element } from '../render/element'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'
import { shelf, shelfRow } from './reorder.fixtures'

/* How many times the list has rendered, counted by its behavior hook, which
   runs once each time the list renders. */
let renders = 0
const listBehavior = behaviorFor(shelf)
const counted: UseBehavior = (family, props) => {
  renders += 1
  return listBehavior(family, props)
}

const List = element(shelf, counted)
const Row = element(shelfRow, behaviorFor(shelfRow))

const NAMES: Readonly<Record<string, string>> = { a: 'Apples', b: 'Bread', c: 'Cheese' }

/* The rows stand 20 tall from 100 down the screen, so `a`'s middle is 110,
   `b`'s 130, and `c`'s 150, in a scroll view 400 tall from the top. */
const TOP = 100
const TALL = 20

const before = {
  gesture: gesture(),
  haptics: haptics(),
  measure: measure(),
  motion: motion(),
  scroll: scroll(),
  timers: timers(),
}
let touched: FakeHaptics
let boxes: FakeMeasure<unknown>
let pages: FakeScroll<unknown>
let clock: FakeTimers

beforeEach(() => {
  renders = 0
  setAnnounce(fakeAnnounce())
  setFocus(fakeFocus<unknown>())
  setGesture(nativeGesture)
  touched = fakeHaptics()
  setHaptics(touched)
  setKeys(fakeKeys<unknown>())
  boxes = fakeMeasure<unknown>()
  setMeasure(boxes)
  setMotion(fakeMotion<unknown>())
  pages = fakeScroll<unknown>()
  setScroll(pages)
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setGesture(before.gesture)
  setHaptics(before.haptics)
  setMeasure(before.measure)
  setMotion(before.motion)
  setScroll(before.scroll)
  setTimers(before.timers)
  jest.restoreAllMocks()
})

/**
 * Lets the moments reach the JavaScript thread. `scheduleOnRN` in worklets'
 * mock queues each call as a microtask.
 */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))

/** Each order the page heard, by the event it heard it in. */
const hearing = (told: string[]): Props => ({
  onBeforeReorder: (event: { detail: { keys: string[] } }) =>
    told.push(`before ${event.detail.keys.join(',')}`),
  onReorder: (event: { detail: { keys: string[] } }) =>
    told.push(`reorder ${event.detail.keys.join(',')}`),
})

/**
 * Draws `a`, `b`, and `c` in a scroll view and lays each row out, as React
 * Native does once they are drawn, and hands back a pan for the grip of each
 * row and a way to scroll the page under them.
 */
const drawn = async (props: Props = {}) => {
  const reported = jest.spyOn(capability, 'layoutChanged')
  await render(
    <GestureHandlerRootView>
      <ThemeProvider tokens={{ 'duration-normal': 200 }}>
        <List reorderable {...props}>
          {['a', 'b', 'c'].map((key) => (
            <Row key={key} value={key}>
              {NAMES[key]}
            </Row>
          ))}
        </List>
      </ThemeProvider>
    </GestureHandlerRootView>,
  )
  /* A row's place hears its own layout, is never collapsed, and is no press. */
  const places = screen.container.queryAll(
    (one) =>
      one.props.collapsable === false &&
      one.props.accessible === undefined &&
      typeof one.props.onLayout === 'function',
  )
  for (const place of places) {
    await fireEvent(place, 'layout', {
      nativeEvent: { layout: { height: TALL, width: 300, x: 0, y: 0 } },
    })
  }
  const laid = reported.mock.calls.map(([node]) => node)
  const page = { scrollTo: () => undefined } as unknown as HostInstance
  for (const node of laid) {
    Object.defineProperty(node, 'parentElement', { configurable: true, value: page })
  }
  boxes.place(page, { height: 400, width: 300, x: 0, y: 0 })
  const placed = (by: number) => {
    laid.forEach((node, at) => {
      boxes.place(node, { height: TALL, width: 300, x: 0, y: TOP - by + at * TALL })
    })
  }
  placed(0)
  await act(() => clock.runFrame())
  /* Gesture Handler's detector names the pan of each grip by its tag, in the
     order the rows are drawn. */
  const tags = screen.container
    .queryAll((one) => Array.isArray(one.props.handlerTags))
    .map((one) => (one.props.handlerTags as number[])[0])
  const pan = (key: string) =>
    createGestureController({
      detectorCallbacks: {},
      handlerTag: tags[['a', 'b', 'c'].indexOf(key)],
    } as never) as unknown as GestureController<{ readonly absoluteY: number }>
  /* Scrolls the page `by` from its start, as a reader does, and lets the
     list hear the rows again at the next frame. */
  const scrollTo = async (by: number) => {
    placed(by)
    pages.place(page, { x: 0, y: by })
    await act(() => scrolled(page, { x: 0, y: by }))
    await act(() => clock.runFrame())
  }
  return { pan, scrollTo }
}

describe('useReorder with the native gesture driver', () => {
  test('passes the rows where the page has scrolled them, during a press', async () => {
    const told: string[] = []
    const { pan, scrollTo } = await drawn(hearing(told))
    const a = pan('a')
    a.begin({ absoluteY: 110 })
    a.activate({ absoluteY: 115 })
    await settle()
    /* The page scrolls 30 under the held row, so `b`'s middle is at 100 and
       `c`'s at 120, and the pointer goes on to 125, past both. */
    await scrollTo(30)
    a.update({ absoluteY: 125 })
    await settle()
    a.end({ absoluteY: 125 })
    await settle()
    expect(touched.played).toEqual(['lift', 'pass', 'drop'])
    expect(told).toEqual(['before b,c,a', 'reorder b,c,a'])
  })
})

describe('useReorder in a scroll view', () => {
  /** Draws `count` frames, each of which asks the list to scroll by the edge's speed. */
  const frames = async (count: number) => {
    for (let frame = 0; frame < count; frame += 1) {
      await act(() => clock.runFrame())
    }
  }

  /* Measured October 11, 2026: this drag rendered the list 23 times while
     each frame's move was drawn, one for each of its 20 frames, and 3 times
     once a move that changes nothing drawn cost no render. */
  test('renders the list for each move it draws, and for no frame between them', async () => {
    const { pan } = await drawn()
    const a = pan('a')
    const before = renders
    /* The press and the lift reach the list in one turn, and React draws them once. */
    a.begin({ absoluteY: 110 })
    a.activate({ absoluteY: 115 })
    await settle()
    await frames(10)
    a.update({ absoluteY: 135 })
    await settle()
    await frames(10)
    a.end({ absoluteY: 135 })
    await settle()
    expect(touched.played).toEqual(['lift', 'pass', 'drop'])
    expect(renders - before).toBe(3)
  })
})
