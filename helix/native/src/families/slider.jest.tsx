/*
 * The generated Slider, drawn from its real intermediate form: one control a
 * screen reader adjusts, named by the label and reading the value, the
 * track, its fill and the thumb drawn as parts at the value, a press on the
 * track that takes the value there, a screen reader's and the keys' steps,
 * the readout, the marks and their labels, and the bubble. `test:native`
 * writes the component beside this file.
 */
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { HelixTheme } from '../theme/helix-theme'
import { HelixSlider, type HelixSliderProps } from './slider/index.native'

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
})

/** The one control a screen reader adjusts, which every spec here names. */
const control = () => {
  const found = screen.root
    ?.queryAll((node) => node.props.accessibilityRole === 'adjustable')
    .find((node) => typeof node.props.onAccessibilityAction === 'function')
  if (found === undefined) {
    throw new Error('no control is drawn')
  }
  return found
}

/** A screen reader's increment or decrement. */
const adjust = (actionName: 'decrement' | 'increment') =>
  act(async () => {
    await fireEvent(control(), 'accessibilityAction', { nativeEvent: { actionName } })
  })

/** A press on the track 200 points long at `x` points from its start. */
const pressAt = async (x: number) => {
  await act(async () => {
    fireEvent(control(), 'layout', {
      nativeEvent: { layout: { height: 20, width: 200, x: 0, y: 0 } },
    })
  })
  /* The press is the second of the gestures the control's detector holds. */
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  let press: unknown
  for (
    let fiber = control().unstable_fiber as Fiber | null;
    fiber !== null && press === undefined;
    fiber = fiber.return
  ) {
    press = fiber.memoizedProps?.gesture?.gestures?.[1]
  }
  await act(async () => {
    fireGestureHandler(press as never, [
      { state: State.BEGAN, x, y: 10 },
      { state: State.ACTIVE, x, y: 10 },
      { state: State.END, x, y: 10 },
    ])
  })
}

/** How many times words are drawn, hidden from screen readers or not. */
const drawn = (words: string): number =>
  screen.queryAllByText(words, { includeHiddenElements: true }).length

/** Where the thumb stands along its layer, as its style places it: the one view ringed with a shadow. */
const thumbAt = (): unknown => {
  const thumb = screen.root
    ?.queryAll((node) => node.type === 'View')
    .find((node) => StyleSheet.flatten(node.props.style)?.boxShadow !== undefined)
  return StyleSheet.flatten(thumb?.props.style)?.start
}

const Slider = (props: HelixSliderProps) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <HelixSlider {...props} />
    </HelixTheme>
  </GestureHandlerRootView>
)

describe('the generated Slider', () => {
  describe('a range', () => {
    const thumbs = () =>
      (screen.root?.queryAll(
        (node) =>
          node.props.accessibilityRole === 'adjustable' &&
          typeof node.props.onAccessibilityAction === 'function',
      ) ?? []) as never[]
    const step = async (at: number, actionName: 'decrement' | 'increment') => {
      await act(async () => {
        ;(
          thumbs()[at] as unknown as {
            props: { onAccessibilityAction: (event: unknown) => void }
          }
        ).props.onAccessibilityAction({ nativeEvent: { actionName } })
      })
    }

    test('is a control for each value, named by its place, and each stops at its neighbor', async () => {
      const values: unknown[] = []
      await render(
        <Slider
          defaultValue="20,21,80"
          label="Stops"
          minStepsBetweenThumbs={1}
          onChange={(event) => values.push(event.target.value)}
          range
        />,
      )
      const said = thumbs().map(
        (one) =>
          (one as unknown as { props: { accessibilityLabel: string } }).props.accessibilityLabel,
      )
      expect(said).toEqual(['Stops minimum', 'Stops thumb 2', 'Stops maximum'])
      expect(
        (thumbs()[0] as unknown as { props: { accessibilityValue: object } }).props
          .accessibilityValue,
      ).toMatchObject({ max: 20, min: 0, now: 20 })
      await step(0, 'increment')
      expect(values).toEqual([])
      await step(2, 'decrement')
      expect(values).toEqual(['20,21,79'])
    })

    test('writes its readout with range-text, and a value with formatter', async () => {
      await render(
        <Slider
          defaultValue="20,70"
          formatter={(value) => `$${value}`}
          label="Price"
          range
          rangeText="{start} until {end}"
          showValue
        />,
      )
      expect(drawn('$20 until $70')).toBe(1)
    })

    test('opens fully wide with no value', async () => {
      await render(<Slider label="Price" range showValue />)
      expect(drawn('0 to 100')).toBe(1)
    })
  })

  test('formatter writes a single value and what a screen reader hears', async () => {
    await render(
      <Slider defaultValue="40" formatter={(value) => `${value} dB`} label="Gain" showValue />,
    )
    expect(drawn('40 dB')).toBe(1)
    expect(control().props.accessibilityValue.text).toBe('40 dB')
  })

  test('is one adjustable control named by its label, reading its value', async () => {
    await render(<Slider defaultValue="40" label="Volume" />)
    expect(control().props.accessibilityLabel).toBe('Volume')
    expect(control().props.accessibilityValue).toMatchObject({ max: 100, min: 0, now: 40 })
  })

  test('starts in the middle where nothing sets it, and holds a written value to its step', async () => {
    await render(<Slider label="Zoom" />)
    expect(control().props.accessibilityValue).toMatchObject({ now: 50 })
    await render(<Slider label="Zoom" step={25} value="60" />)
    expect(control().props.accessibilityValue).toMatchObject({ now: 50 })
  })

  test('steps with a screen reader, sending input and change, and stops at its end', async () => {
    const events: string[] = []
    await render(
      <Slider
        defaultValue="90"
        label="Volume"
        onBeforeChange={(event) => events.push(`before ${event.detail.value}`)}
        onChange={() => events.push('change')}
        onInput={() => events.push('input')}
        step={10}
      />,
    )
    await adjust('increment')
    await adjust('increment')
    expect(events).toEqual(['before 100', 'input', 'change'])
    expect(control().props.accessibilityValue).toMatchObject({ now: 100 })
    await adjust('decrement')
    expect(control().props.accessibilityValue).toMatchObject({ now: 90 })
  })

  test('takes a press on the track to the value there, and a refused move nowhere', async () => {
    let refuse = false
    const events: string[] = []
    await render(
      <Slider
        defaultValue="40"
        label="Volume"
        onBeforeChange={(event) => {
          if (refuse) {
            event.preventDefault()
          }
        }}
        onChange={() => events.push('change')}
        onInput={() => events.push('input')}
      />,
    )
    await pressAt(150)
    expect(control().props.accessibilityValue).toMatchObject({ now: 75 })
    expect(events).toEqual(['input', 'change'])
    refuse = true
    await pressAt(20)
    expect(control().props.accessibilityValue).toMatchObject({ now: 75 })
    expect(events).toEqual(['input', 'change'])
  })

  test('moves nothing while disabled or read-only, and a screen reader still hears it', async () => {
    await render(<Slider defaultValue="40" disabled label="Volume" />)
    await adjust('increment')
    expect(control().props.accessibilityValue).toMatchObject({ now: 40 })
    expect(control().props.accessibilityState).toMatchObject({ disabled: true })
    await render(<Slider defaultValue="40" label="Volume" readonly />)
    await adjust('increment')
    expect(control().props.accessibilityValue).toMatchObject({ now: 40 })
  })

  test('draws the thumb at the value, and the readout in its format', async () => {
    await render(
      <Slider
        defaultValue="0.4"
        formatOptions={{ style: 'percent' }}
        label="Opacity"
        max={1}
        showValue
        step={0.1}
      />,
    )
    expect(thumbAt()).toBe('40%')
    expect(drawn('40%')).toBe(1)
    expect(control().props.accessibilityValue).toMatchObject({ text: '40%' })
  })

  test('says its value in its value text', async () => {
    await render(<Slider defaultValue="20" label="Heading" valueText="{value} degrees" />)
    expect(control().props.accessibilityValue).toMatchObject({ text: '20 degrees' })
  })

  test('draws its marks, and their labels where it asks for them', async () => {
    await render(<Slider defaultValue="50" label="Text size" markerLabels markers={5} step={25} />)
    expect(['25', '50', '75', '100'].map(drawn)).toEqual([1, 1, 1, 1])
  })

  test('draws a bubble with the value where it asks for one', async () => {
    await render(<Slider defaultValue="30" label="Price" tooltip />)
    expect(drawn('30')).toBe(1)
  })
})
