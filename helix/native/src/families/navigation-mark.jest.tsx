/*
 * The generated Navigation's mark, drawn from its real intermediate forms:
 * it stands at the item the page marks current, the one marked `page`
 * where several are, travels as the page moves the mark, takes each
 * marker's shape, and stands open while a popover among the destinations
 * does. `test:native` writes the components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { keys, setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type FakeMeasure, fakeMeasure } from '@fusion.dev/helix-core/capabilities/measure/fake'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { type FakeMotion, fakeMotion } from '@fusion.dev/helix-core/capabilities/motion/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, View } from 'react-native'
import * as capability from '../capabilities/measure'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import {
  HelixNavigation,
  HelixNavigationItem,
  type HelixNavigationProps,
} from './navigation/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

const before = { keys: keys(), measure: measure(), motion: motion(), timers: timers() }
let boxes: FakeMeasure<unknown>
let moves: FakeMotion<unknown>
/* The link each item listens for keys on, in the order they were drawn. */
let links: unknown[] = []

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  setFocus(fakeFocus<unknown>())
  const fake = fakeKeys<unknown>()
  links = []
  setKeys({
    ...fake,
    listen: (node, hear) => {
      if (!links.includes(node)) {
        links.push(node)
      }
      return fake.listen(node, hear)
    },
  })
  boxes = fakeMeasure<unknown>()
  setMeasure(boxes)
  moves = fakeMotion<unknown>()
  setMotion(moves)
  setTimers(fakeTimers())
})

afterEach(() => {
  setKeys(before.keys)
  setMeasure(before.measure)
  setMotion(before.motion)
  setTimers(before.timers)
})

/** A box in the viewport, as the measure capability reads one. */
const box = (x: number, y: number, width = 60, height = 32): Rect => ({ height, width, x, y })

/* The bar at 16 across and 100 down, and three items 60 by 32 in it, 4 apart. */
const BAR: Rect = { height: 32, width: 300, x: 16, y: 100 }
const ROW = [box(16, 100), box(80, 100), box(144, 100)]

/** Three items, each current as `current` says. */
const bar = (props: Partial<HelixNavigationProps>, current: readonly (string | undefined)[]) => (
  <HelixTheme Glyph={Recorded} mode="light">
    <HelixNavigation label="Sections" {...props}>
      {['one', 'two', 'three'].map((name, at) => (
        <HelixNavigationItem
          href={`/${name}`}
          key={name}
          {...(current[at] === undefined ? {} : { current: current[at] as 'page' })}
        >
          {name}
        </HelixNavigationItem>
      ))}
    </HelixNavigation>
  </HelixTheme>
)

/**
 * Lays out the view the bar's content is laid out in, and hands it to the
 * bar, as React Native does once its scroll view is drawn.
 */
const handOver = async (at: Rect = BAR) => {
  const content = { view: 'content' }
  boxes.place(content, at)
  const [scroller] = screen.container.queryAll(
    (one) => typeof one.props.innerViewRef === 'function',
  )
  await act(() => scroller?.props.innerViewRef(content))
}

/** Draws the bar and lays each item out where `laid` says. */
const drawn = async (
  props: Partial<HelixNavigationProps>,
  current: readonly (string | undefined)[],
  laid = ROW,
) => {
  const view = await render(bar(props, current))
  await act(() => {
    links.forEach((node, at) => {
      boxes.place(node, laid[at] ?? null)
    })
  })
  return view
}

/** Where the mark stands now. */
const mark = () => moves.where(moves.calls[0]?.node)

describe('the generated Navigation’s mark', () => {
  test('stands on the current item, at its place in the bar and its size', async () => {
    await drawn({}, [undefined, 'page'])
    await handOver()
    expect(mark()).toEqual({ height: 32, width: 60, x: 64, y: 0 })
  })

  test('travels to the item the page marks next', async () => {
    const view = await drawn({}, [undefined, 'page'])
    await handOver()
    await view.rerender(bar({}, [undefined, undefined, 'page']))
    expect(moves.gliding(moves.calls[0]?.node)?.to).toEqual({ height: 32, width: 60, x: 128, y: 0 })
  })

  test('stands on the item marked `page` where another is marked as well', async () => {
    await drawn({}, ['location', undefined, 'page'])
    await handOver()
    expect(mark()).toEqual({ height: 32, width: 60, x: 128, y: 0 })
  })

  test('stands on an item marked any way where none is the page', async () => {
    await drawn({}, [undefined, 'location'])
    await handOver()
    expect(mark()?.x).toBe(64)
  })

  test('under `underlined`, is a bar along the bottom of the current item', async () => {
    await drawn({ marker: 'underlined' }, [undefined, 'page'])
    await handOver()
    const at = mark()
    expect(at?.x).toBe(64)
    expect(at?.width).toBe(60)
    expect(at?.height).toBeLessThan(4)
  })

  test('down a column, stands at the current item’s place down it', async () => {
    const column = [box(16, 100, 200), box(16, 132, 200), box(16, 164, 200)]
    await drawn({ orientation: 'vertical' }, [undefined, undefined, 'page'], column)
    const reported = jest.spyOn(capability, 'layoutChanged')
    const [nav] = screen.container.queryAll((one) => one.props.role === 'navigation')
    await fireEvent(nav as never, 'layout', {
      nativeEvent: { layout: { height: 96, width: 200, x: 0, y: 0 } },
    })
    const [own] = reported.mock.calls.map(([node]) => node)
    await act(() => boxes.place(own, { height: 96, width: 200, x: 16, y: 100 }))
    reported.mockRestore()
    expect(mark()).toMatchObject({ height: 32, width: 200, y: 64 })
  })
})
