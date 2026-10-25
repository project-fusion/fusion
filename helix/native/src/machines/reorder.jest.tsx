import { announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { focus, setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { gesture, setGesture } from '@fusion.dev/helix-core/capabilities/gesture'
import { type FakeGesture, fakeGesture } from '@fusion.dev/helix-core/capabilities/gesture/fake'
import { haptics, setHaptics } from '@fusion.dev/helix-core/capabilities/haptics'
import { type FakeHaptics, fakeHaptics } from '@fusion.dev/helix-core/capabilities/haptics/fake'
import { keys, setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type FakeMeasure, fakeMeasure } from '@fusion.dev/helix-core/capabilities/measure/fake'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { type FakeMotion, fakeMotion } from '@fusion.dev/helix-core/capabilities/motion/fake'
import { scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { fakeScroll } from '@fusion.dev/helix-core/capabilities/scroll/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { DragSetup } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { type HostInstance, StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as capability from '../capabilities/measure'
import { scrolled } from '../capabilities/scroll'
import type { Props } from '../render/behavior'
import { element } from '../render/element'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'
import { shelf, shelfRow } from './reorder.fixtures'

const List = element(shelf, behaviorFor(shelf))
const Row = element(shelfRow, behaviorFor(shelfRow))

const NAMES: Readonly<Record<string, string>> = { a: 'Apples', b: 'Bread', c: 'Cheese' }

/* Words that say each place, so a spec reads which place each step names. */
const WORDS = {
  canceledLabel: '{name} back at position {position}',
  droppedLabel: 'Dropped {name} at position {position} of {count}',
}

/* The rows stand 20 tall from 100 down the screen, so `a`'s middle is 110,
   `b`'s 130, and `c`'s 150. */
const TOP = 100
const TALL = 20

const before = {
  announce: announce(),
  focus: focus(),
  gesture: gesture(),
  haptics: haptics(),
  keys: keys(),
  measure: measure(),
  motion: motion(),
  scroll: scroll(),
  timers: timers(),
}
let said: FakeAnnounce
let dragged: FakeGesture<unknown>
let touched: FakeHaptics
let pressed: FakeKeys<unknown>
let boxes: FakeMeasure<unknown>
let moved: FakeMotion<unknown>
let clock: FakeTimers
/* Each view a drag was heard on, in the order first heard, with its latest setup, and each view keys were heard on. */
let heard: Map<unknown, DragSetup>
let listened: unknown[]

beforeEach(() => {
  said = fakeAnnounce()
  setAnnounce(said)
  setFocus(fakeFocus<unknown>())
  const drags = fakeGesture<unknown>()
  heard = new Map()
  dragged = {
    ...drags,
    drag: (node, setup, hear) => {
      heard.set(node, setup)
      return drags.drag(node, setup, hear)
    },
  }
  setGesture(dragged)
  touched = fakeHaptics()
  setHaptics(touched)
  const fake = fakeKeys<unknown>()
  listened = []
  pressed = {
    ...fake,
    listen: (node, hear) => {
      listened.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(pressed)
  boxes = fakeMeasure<unknown>()
  setMeasure(boxes)
  moved = fakeMotion<unknown>()
  setMotion(moved)
  setScroll(fakeScroll<unknown>())
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setAnnounce(before.announce)
  setFocus(before.focus)
  setGesture(before.gesture)
  setHaptics(before.haptics)
  setKeys(before.keys)
  setMeasure(before.measure)
  setMotion(before.motion)
  setScroll(before.scroll)
  setTimers(before.timers)
  jest.restoreAllMocks()
})

/** The rows in `order`, in a list whose rows move, with `props` on the list. */
const page = (order: readonly string[], props: Props = {}) => (
  <GestureHandlerRootView>
    <ThemeProvider tokens={{ 'duration-normal': 200 }}>
      <List reorderable {...WORDS} {...props}>
        {order.map((key) => (
          <Row key={key} value={key}>
            {NAMES[key]}
          </Row>
        ))}
      </List>
    </ThemeProvider>
  </GestureHandlerRootView>
)

/**
 * Draws the rows in `order` and lays each out, as React Native does once
 * they are drawn: each row's place reports its layout, and the list hears
 * the rows again at the next frame, where they stand.
 */
const drawn = async (props: Props = {}, order: readonly string[] = ['a', 'b', 'c']) => {
  const reported = jest.spyOn(capability, 'layoutChanged')
  const view = await render(page(order, props))
  /* A row's place hears its own layout, is never collapsed, and is no press. */
  const places = screen.container.queryAll(
    (one) =>
      one.props.collapsable === false &&
      one.props.accessible === undefined &&
      typeof one.props.onLayout === 'function',
  )
  const layOut = async () => {
    for (const place of places) {
      await fireEvent(place, 'layout', {
        nativeEvent: { layout: { height: TALL, width: 300, x: 0, y: 0 } },
      })
    }
  }
  await layOut()
  const laid = reported.mock.calls.map(([node]) => node)
  laid.forEach((node, at) => {
    boxes.place(node, { height: TALL, width: 300, x: 0, y: TOP + at * TALL })
  })
  await act(() => clock.runFrame())
  return { laid, layOut, view }
}

/** The view a pointer drags the row with `key` by, as the rows were first drawn: `a`, `b`, `c`. */
const dragging = (key: string): unknown => [...heard.keys()][['a', 'b', 'c'].indexOf(key)]

/** The grip of the row with `key`, which the keys are pressed on. */
const gripOf = (key: string): unknown =>
  listened.find(
    (node) =>
      (node as { props?: { accessibilityLabel?: string } }).props?.accessibilityLabel ===
      `Move ${NAMES[key]}`,
  )

/** Presses `key` on the grip of the row `on`, and answers whether the list took it. */
const press = async (on: string, key: string): Promise<boolean> => {
  let taken = false
  await act(() => {
    taken = pressed.press(gripOf(on), key)
  })
  return taken
}

/** Drags `a` down past the middles of `b` and `c`, from 110 to 155, and lets it go. */
const dragDown = async () => {
  const a = dragging('a')
  await act(() => dragged.down(a, { x: 0, y: 110 }))
  for (const y of [115, 135, 155]) {
    await act(() => dragged.move(a, { x: 0, y }))
  }
  await act(() => dragged.up(a))
}

/** Each place and glide, without the view it moved. */
const calls = () =>
  moved.calls.map((one) => (one.call === 'glide' ? { call: 'glide', to: one.to } : one.to))

/** Each order the page heard, by the event it heard it in. */
const hearing = (told: string[]) => ({
  onBeforeReorder: (event: { detail: { keys: string[] } }) =>
    told.push(`before ${event.detail.keys.join(',')}`),
  onReorder: (event: { detail: { keys: string[] } }) =>
    told.push(`reorder ${event.detail.keys.join(',')}`),
})

const words = () => said.said.map(({ message }) => message)

describe('useReorder with the keys', () => {
  test('picks a row up from its grip, steps it, and drops it, saying each step', async () => {
    const told: string[] = []
    await drawn(hearing(told))
    expect(await press('a', 'Enter')).toBe(true)
    expect(await press('a', 'ArrowDown')).toBe(true)
    expect(await press('a', 'Enter')).toBe(true)
    expect(told).toEqual(['before b,a,c', 'reorder b,a,c'])
    expect(words()).toEqual([
      'Picked up Apples',
      'Apples moved to position 2 of 3',
      'Dropped Apples at position 2 of 3',
    ])
    expect(touched.played).toEqual(['lift', 'pass', 'drop'])
    expect(moved.calls).toEqual([])
  })

  test('takes no arrow on a grip whose row is not held', async () => {
    await drawn()
    expect(await press('a', 'ArrowDown')).toBe(false)
    expect(words()).toEqual([])
  })
})

describe('useReorder with a pointer', () => {
  test('lifts a row, makes room as it passes the others, and asks the page on the drop', async () => {
    const told: string[] = []
    await drawn(hearing(told))
    await dragDown()
    expect(told).toEqual(['before b,c,a', 'reorder b,c,a'])
    expect(touched.played).toEqual(['lift', 'pass', 'pass', 'drop'])
    /* `b` and `c` stand 20 up as `a` passes each. `a` is let go 45 below its
       place, where it stays as the pointer goes up, and glides on to its new
       place, 40 below, where `c` ends. */
    expect(calls()).toEqual([
      { call: 'glide', to: { y: -20 } },
      { call: 'glide', to: { y: -20 } },
      { y: 45 },
      { y: 45 },
      { call: 'glide', to: { y: 40 } },
    ])
  })

  test('puts the row at rest once the page draws the new order, and the others with it', async () => {
    const { view } = await drawn()
    await dragDown()
    const placed = moved.calls.length
    await view.rerender(page(['b', 'c', 'a']))
    expect(calls().slice(placed)).toEqual([{ y: 0 }, { y: 0 }, { x: 0, y: 0 }])
    expect(clock.pending().timeouts).toBe(0)
  })

  test('glides a refused drop back, and the others with it', async () => {
    await drawn({
      onBeforeReorder: (event: { preventDefault(): void }) => event.preventDefault(),
    })
    await dragDown()
    expect(words()).toEqual(['Apples back at position 1'])
    expect(touched.played).toEqual(['lift', 'pass', 'pass', 'cancel'])
    expect(calls().slice(2)).toEqual([
      { y: 45 },
      { call: 'glide', to: { y: 0 } },
      { call: 'glide', to: { y: 0 } },
      { y: 45 },
      { call: 'glide', to: { y: 0 } },
    ])
  })
})

describe('useReorder when Escape stops a drag', () => {
  test('lets go of the drag, says the row is back, and hears it again', async () => {
    const told: string[] = []
    await drawn(hearing(told))
    const a = dragging('a')
    await act(() => dragged.down(a, { x: 0, y: 110 }))
    await act(() => dragged.move(a, { x: 0, y: 135 }))
    expect(dragged.listening(a)).toBe(1)
    let taken = false
    await act(() => {
      taken = pressed.press(gripOf('b'), 'Escape')
    })
    expect(taken).toBe(true)
    expect(dragged.listening(a)).toBe(0)
    expect(words()).toEqual(['Apples back at position 1'])
    expect(told).toEqual([])
    await act(() => clock.runFrame())
    expect(dragged.listening(a)).toBe(1)
  })
})

describe('useReorder while rows may not move', () => {
  test('draws no grip and hears no drag', async () => {
    const { view } = await drawn()
    expect(screen.queryByLabelText('Move Apples')).not.toBeNull()
    await view.rerender(page(['a', 'b', 'c'], { reorderable: false }))
    expect(screen.queryByLabelText('Move Apples')).toBeNull()
    const a = dragging('a')
    expect(dragged.listening(a)).toBe(0)
    await act(() => dragged.down(a, { x: 0, y: 110 }))
    await act(() => dragged.move(a, { x: 0, y: 155 }))
    await act(() => dragged.up(a))
    expect([touched.played, moved.calls, words()]).toEqual([[], [], []])
  })

  /**
   * How many views a drag and a glide move, and how many rows' places there
   * are: a place hears its own layout, is never collapsed, and is no press.
   */
  const views = () => ({
    moving: screen.container.queryAll(
      (one) => StyleSheet.flatten(one.props.style)?.transform !== undefined,
    ).length,
    places: screen.container.queryAll(
      (one) =>
        one.props.collapsable === false &&
        one.props.accessible === undefined &&
        typeof one.props.onLayout === 'function',
    ).length,
  })

  test('draws each row as a plain view, and with its place and moving views once rows may move', async () => {
    const view = await render(page(['a', 'b', 'c'], { reorderable: false }))
    expect(views()).toEqual({ moving: 0, places: 0 })
    await view.rerender(page(['a', 'b', 'c']))
    expect(views()).toEqual({ moving: 6, places: 3 })
  })

  test('mounts what each row holds again as rows begin or stop moving', async () => {
    let mounts = 0
    const Held = ({ name }: { readonly name: string }) => {
      useEffect(() => {
        mounts += 1
      }, [])
      return <Text>{name}</Text>
    }
    const rows = (reorderable: boolean) => (
      <GestureHandlerRootView>
        <List reorderable={reorderable}>
          {['a', 'b', 'c'].map((key) => (
            <Row key={key} value={key}>
              <Held name={NAMES[key] ?? key} />
            </Row>
          ))}
        </List>
      </GestureHandlerRootView>
    )
    const view = await render(rows(false))
    await view.rerender(rows(true))
    await view.rerender(rows(false))
    expect(mounts).toBe(9)
  })
})

describe('useReorder while the page scrolls', () => {
  test('hears the rows again where the page scrolls them', async () => {
    const { laid, layOut } = await drawn()
    /* The rows' places in a scroll view that fills the screen. */
    const page = { scrollTo: () => undefined } as unknown as HostInstance
    for (const node of laid) {
      Object.defineProperty(node, 'parentElement', { configurable: true, value: page })
    }
    boxes.place(page, { height: 400, width: 300, x: 0, y: 0 })
    await layOut()
    await act(() => clock.runFrame())
    laid.forEach((node, at) => {
      boxes.place(node, { height: TALL, width: 300, x: 0, y: TOP - 30 + at * TALL })
    })
    await act(() => scrolled(page, { x: 0, y: 30 }))
    await act(() => clock.runFrame())
    const stops = heard.get(dragging('a'))?.stops ?? []
    expect([stops.includes(100), stops.includes(120), stops.includes(130)]).toEqual([
      true,
      true,
      false,
    ])
  })
})

describe('useReorder with a screen reader', () => {
  test('moves a row a place as its grip is adjusted, and says where it went', async () => {
    const told: string[] = []
    await drawn(hearing(told))
    await fireEvent(screen.getByLabelText('Move Apples'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    })
    expect(told).toEqual(['before b,a,c', 'reorder b,a,c'])
    expect(words()).toEqual(['Apples moved to position 2 of 3'])
  })
})
