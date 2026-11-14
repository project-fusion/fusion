/*
 * The generated Sparkline, drawn from its real intermediate form: the line,
 * its wash, the columns and the band core draws, the marks over the strip at
 * their percentages, a table's rows by its id, and the reading a finger, a
 * key, and a screen reader move, with the events each move sends.
 * `test:native` writes the component beside this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { publishChartSource } from '../render/chart-sources'
import { HelixTheme } from '../theme/helix-theme'
import { HelixSparkline, type HelixSparklineProps } from './sparkline/index.native'

let keys: FakeKeys<unknown>
let listening: unknown[]

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, heard) => {
      listening.push(node)
      return fake.listen(node, heard)
    },
  }
  setKeys(keys)
})

const Sparkline = (props: HelixSparklineProps) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <HelixSparkline {...props} />
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** The plot a screen reader reaches as one control. */
const plot = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no plot is drawn')
  }
  return found
}

/** The press and the drag the plot's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = plot().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** Lays the plot out 140 points wide. */
const lay = () =>
  act(async () => {
    fireEvent(plot(), 'layout', { nativeEvent: { layout: { height: 35, width: 140, x: 0, y: 0 } } })
  })

/** A tap on the plot at `x` points from its start. */
const tapAt = async (x: number) => {
  await lay()
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y: 10 },
      { state: State.ACTIVE, x, y: 10 },
      { state: State.END, x, y: 10 },
    ])
  })
}

/** A key pressed on the plot, as a hardware keyboard sends it. */
const key = async (name: string) => {
  await act(() => {
    const held = { alt: false, control: false, shift: false }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** Each reading event a handler heard, with its place and what moved it. */
const heard = () => {
  const events: string[] = []
  const take =
    (name: string) =>
    (event: { detail: { index: number; label: string; pointerType: string } }) => {
      events.push(
        `${name} ${event.detail.index} ${event.detail.pointerType} ${event.detail.label}`.trim(),
      )
    }
  return { events, props: { onReadingChange: take('change'), onReadingPress: take('press') } }
}

/** A table that publishes two days of deploys under the id `deploys`, as a phone's `<table>` does. */
const Table = () => {
  useEffect(
    () =>
      publishChartSource('deploys', {
        caption: 'Deploys',
        rows: [
          { cells: [{ name: '', text: '4', value: 4 }], label: 'Sat' },
          { cells: [{ name: '', text: '12', value: 12 }], label: 'Sun' },
        ],
      }),
    [],
  )
  return null
}

const SEVEN = '1240 1318 1102 1291 1244 1180 1102'

describe('the drawing', () => {
  test('draws the line and its wash, and the wash runs through its gradient', async () => {
    await render(<Sparkline curve="straight" values="0 10 5" />)
    const paths = shapes('RNSVGPath')
    expect(paths.map((one) => one.props.d)).toEqual([
      'M0,32L50,0L100,16',
      'M0,32L50,0L100,16L100,32L0,32Z',
    ])
    expect(paths[1]?.props.fill).toEqual({ brushRef: 'sparkline-wash', type: 1 })
    expect(shapes('RNSVGLinearGradient')).toHaveLength(1)
  })

  test('draws a column for each reading under a bar plot, and no line', async () => {
    await render(<Sparkline plot="bar" values="5 10" />)
    expect(shapes('RNSVGPath')).toHaveLength(0)
    expect(shapes('RNSVGRect').map((one) => Math.round(Number(one.props.height)))).toEqual([16, 32])
  })

  test('stretches the strip to its box and keeps the stroke its weight', async () => {
    await render(<Sparkline plot="line" values={SEVEN} />)
    expect(shapes('RNSVGSvgView')[0]?.props.align).toBe('none')
    expect(shapes('RNSVGPath')[0]?.props.vectorEffect).toBe(1)
  })

  test('draws the band range asks for', async () => {
    await render(<Sparkline range="0 20" values="5 10" />)
    expect(shapes('RNSVGRect')).toHaveLength(1)
  })

  test('reads the rows of the table its for names', async () => {
    await render(
      <>
        <Table />
        <Sparkline curve="straight" for="deploys" plot="line" />
      </>,
    )
    expect(shapes('RNSVGPath')[0]?.props.d).toBe('M0,32L100,0')
  })
})

describe('the reading', () => {
  test('a tap shows the reading under the finger and presses it, with a tick', async () => {
    const { events, props } = heard()
    await render(<Sparkline label="Sessions" values={SEVEN} {...props} />)
    await tapAt(70)
    expect(events).toEqual(['press 3 touch', 'change 3 touch'])
    expect(screen.getByText('1,291', { includeHiddenElements: true })).toBeTruthy()
    expect(plot().props.accessibilityValue).toEqual({ text: '1,291 (4 of 7)' })
  })

  test('a drag scrubs from reading to reading and presses none', async () => {
    const { events, props } = heard()
    await render(<Sparkline label="Sessions" values={SEVEN} {...props} />)
    await lay()
    await act(async () => {
      fireGestureHandler(gestures()[0] as never, [
        { state: State.BEGAN, translationX: 0, x: 5, y: 10 },
        { state: State.ACTIVE, translationX: 10, x: 15, y: 10 },
        { state: State.ACTIVE, translationX: 40, x: 45, y: 10 },
        { state: State.END, translationX: 40, x: 45, y: 10 },
      ])
    })
    expect(events).toEqual(['change 0 touch', 'change 2 touch'])
  })

  test('a screen reader steps the reading on and back, as one control', async () => {
    const { events, props } = heard()
    await render(<Sparkline label="Sessions" values={SEVEN} {...props} />)
    expect(plot().props.accessibilityRole).toBe('adjustable')
    expect(plot().props.accessibilityHint).toBe('From 1,240 to 1,102, highest 1,318, lowest 1,102')
    for (const actionName of ['increment', 'increment', 'decrement']) {
      await act(async () => {
        await fireEvent(plot(), 'accessibilityAction', { nativeEvent: { actionName } })
      })
    }
    expect(events).toEqual(['change 0 keyboard', 'change 1 keyboard', 'change 0 keyboard'])
  })

  test('the keys walk the readings, Enter presses, and Escape puts the reading away', async () => {
    const { events, props } = heard()
    await render(<Sparkline label="Sessions" values={SEVEN} {...props} />)
    await key('End')
    await key('ArrowLeft')
    await key('Enter')
    await key('Escape')
    expect(events).toEqual([
      'change 6 keyboard',
      'change 5 keyboard',
      'press 5 keyboard',
      'change -1 keyboard',
    ])
  })

  test('an unnamed sparkline is decoration, with no control, and a finger still reads it', async () => {
    await render(<Sparkline values={SEVEN} />)
    expect(
      screen.root?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function'),
    ).toHaveLength(0)
    const plotted = screen.root
      ?.queryAll((node) => typeof node.props.onLayout === 'function')
      .find((node) => node.props.accessibilityRole === undefined && node.type === 'View')
    expect(plotted).toBeDefined()
  })

  test('moving the reading leaves the canvas as it is drawn, a layer of its own', async () => {
    await render(<Sparkline label="Sessions" values={SEVEN} />)
    await lay()
    const before = shapes('RNSVGPath')[0]?.props
    await tapAt(70)
    await tapAt(10)
    expect(shapes('RNSVGPath')[0]?.props).toBe(before)
  })

  test('the cursor stands at its reading, over the strip', async () => {
    await render(<Sparkline curve="straight" label="Sessions" values="0 10 5" />)
    await tapAt(70)
    const cursor = screen.root
      ?.queryAll((node) => node.type === 'View')
      .map((node) => StyleSheet.flatten(node.props.style))
      .find(
        (style) => style?.start === '50%' && style?.top === '0%' && style?.boxShadow !== undefined,
      )
    expect(cursor).toBeDefined()
  })
})
