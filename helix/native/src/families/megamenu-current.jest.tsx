/*
 * The generated Megamenu in a Navigation, drawn from its real intermediate
 * forms: while a destination in its panel is the page, the megamenu is the
 * navigation's current destination, read from what is passed in, so the
 * navigation's mark stands at its trigger while the panel is closed, as the
 * web's mark stands at a megamenu holding the page. `test:native` writes
 * the components beside this file.
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
import { holdsPage, megamenuCurrent } from '@fusion.dev/helix-core/derivations'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Dimensions } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixMegamenu, HelixMegamenuGroup, HelixMegamenuItem } from './megamenu/index.native'
import { HelixNavigation, HelixNavigationItem } from './navigation/index.native'

const before = { keys: keys(), measure: measure(), motion: motion(), timers: timers() }
let boxes: FakeMeasure<unknown>
let moves: FakeMotion<unknown>
/* Each destination's press, in the order it listened for keys. */
let presses: unknown[] = []

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  setFocus(fakeFocus<unknown>())
  const fake = fakeKeys<unknown>()
  presses = []
  setKeys({
    ...fake,
    listen: (node, hear) => {
      if (!presses.includes(node)) {
        presses.push(node)
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

/** Overview, the Products megamenu, and Pricing, with Reports the page where `page` says. */
const bar = (page: boolean) => (
  <HelixTheme mode="light">
    <HelixNavigation label="Main">
      <HelixNavigationItem href="#overview">Overview</HelixNavigationItem>
      <HelixMegamenu label="Products">
        <HelixMegamenuGroup label="Insights">
          <HelixMegamenuItem href="#reports" {...(page ? { current: 'page' } : {})}>
            Reports
          </HelixMegamenuItem>
        </HelixMegamenuGroup>
      </HelixMegamenu>
      <HelixNavigationItem href="#pricing">Pricing</HelixNavigationItem>
    </HelixNavigation>
  </HelixTheme>
)

/** Lays out the bar's content and each destination in it, as React Native does. */
const laidOut = async () => {
  await act(() => {
    presses.forEach((node, at) => {
      boxes.place(node, box(16 + at * 64, 100))
    })
  })
  const content = { view: 'content' }
  boxes.place(content, { height: 32, width: 300, x: 16, y: 100 })
  const [scroller] = screen.container.queryAll(
    (one) => typeof one.props.innerViewRef === 'function',
  )
  await act(() => scroller?.props.innerViewRef(content))
}

describe('a Megamenu in a Navigation', () => {
  test('is the current destination while its closed panel holds the page', async () => {
    await render(bar(true))
    await laidOut()
    expect(moves.where(moves.calls[0]?.node)).toEqual({ height: 32, width: 60, x: 64, y: 0 })
  })

  test('is no destination’s mark while nothing in it is the page', async () => {
    await render(bar(false))
    await laidOut()
    /* Nothing is current, so the mark is never moved. */
    expect(moves.calls.length).toBe(0)
  })

  test('reads the page from what is passed in, at any depth', () => {
    const item = { props: { children: 'Reports', current: 'page' } }
    expect(holdsPage([{ props: { children: [item] } }])).toBe(true)
    expect(holdsPage([{ props: { children: 'Reports', current: 'location' } }])).toBe(false)
    expect(megamenuCurrent({ default: { props: { 'aria-current': 'page' } } })).toBe('page')
    expect(megamenuCurrent({ default: 'Reports' })).toBe('')
  })
})
