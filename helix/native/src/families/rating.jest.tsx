/*
 * The generated Rating, drawn from its real intermediate form: one row a
 * screen reader adjusts, named by the label and reading the score, the
 * marks drawn twice with the filled ones clipped to the score, a press and
 * a drag along the row that pick a score, the keys and a screen reader's
 * steps, clearing, the readout, and the sentence a required rating says.
 * `test:native` writes the component beside this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { HelixTheme } from '../theme/helix-theme'
import { HelixRating, type HelixRatingProps } from './rating/index.native'

let keys: FakeKeys<unknown>
/** The nodes the keys capability listens on, which a key goes to. */
let listening: unknown[]

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
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

/** The row a screen reader reaches as one control. */
const row = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no row is drawn')
  }
  return found
}

/** A screen reader's increment or decrement. */
const adjust = (actionName: 'decrement' | 'increment') =>
  act(async () => {
    await fireEvent(row(), 'accessibilityAction', { nativeEvent: { actionName } })
  })

/** The press and the drag the row's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = row().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** Lays the row out 200 points long. */
const lay = () =>
  act(async () => {
    fireEvent(row(), 'layout', { nativeEvent: { layout: { height: 24, width: 200, x: 0, y: 0 } } })
  })

/** A press on the row 200 points long at `x` points from its start. */
const pressAt = async (x: number) => {
  await lay()
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y: 12 },
      { state: State.ACTIVE, x, y: 12 },
      { state: State.END, x, y: 12 },
    ])
  })
}

/** A key pressed on the row, as a hardware keyboard sends it. */
const key = async (name: string) => {
  await act(() => {
    const held = { alt: false, control: false, shift: false }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** How wide the filled marks are drawn: the one view clipped and laid over the row. */
const fillWidth = (): unknown => {
  const fill = screen.root
    ?.queryAll((node) => node.type === 'View')
    .find((node) => {
      const style = StyleSheet.flatten(node.props.style)
      return style?.overflow === 'hidden' && style?.position === 'absolute'
    })
  return StyleSheet.flatten(fill?.props.style)?.width
}

/** Each event a handler heard, by its name, with what it carries or what its target holds. */
const heard = (): { events: string[]; props: Partial<HelixRatingProps> } => {
  const events: string[] = []
  const take = (name: string) => (event: { target: { value?: string } }) => {
    events.push(`${name} ${event.target.value ?? ''}`)
  }
  return {
    events,
    props: {
      onBeforeChange: (event) => {
        events.push(`before-change ${event.detail.value}`)
      },
      onChange: take('change'),
      onClear: take('clear'),
      onInput: take('input'),
      onPreview: (event) => {
        events.push(`preview ${event.detail.value}`)
      },
    },
  }
}

/** The events but the previews, which a drag's spec reads alone. */
const chosen = (events: readonly string[]): readonly string[] =>
  events.filter((one) => !one.startsWith('preview'))

const Rating = (props: HelixRatingProps) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <HelixRating {...props} />
    </HelixTheme>
  </GestureHandlerRootView>
)

describe('the generated Rating', () => {
  test('is one adjustable row named by its label, reading its score', async () => {
    await render(<Rating defaultValue="3" label="Quality" />)
    expect(row().props.accessibilityLabel).toBe('Quality')
    expect(row().props.accessibilityRole).toBe('adjustable')
    expect(row().props.accessibilityValue).toEqual({ text: '3 out of 5' })
  })

  test('draws five marks twice, and fills whole marks and a share of the next', async () => {
    await render(<Rating defaultValue="2.5" label="Quality" step={0.5} />)
    const stars = screen.root?.queryAll((node) => node.type === 'RNSVGPath') ?? []
    expect(stars.length).toBe(10)
    const half = fillWidth() as number
    await render(<Rating defaultValue="2" label="Quality" step={0.5} />)
    const whole = fillWidth() as number
    await render(<Rating defaultValue="3" label="Quality" step={0.5} />)
    /* Two marks and their gaps, then half a mark, then the gap to the third. */
    expect(half).toBeGreaterThan(whole)
    expect(fillWidth()).toBeGreaterThan(half)
  })

  test('picks the score under a press, asking first, and sends input and change', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} label="Quality" />)
    await pressAt(110)
    expect(events).toEqual(['preview 3', 'before-change 3', 'input 3', 'change 3', 'preview '])
    expect(row().props.accessibilityValue).toEqual({ text: '3 out of 5' })
  })

  test('picks a half step on a row of halves', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} label="Quality" step={0.5} />)
    await pressAt(90)
    expect(chosen(events)).toEqual(['before-change 2.5', 'input 2.5', 'change 2.5'])
  })

  test('shows the step a drag is over, and picks it as the drag lets go', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} defaultValue="1" label="Quality" />)
    await lay()
    await act(async () => {
      fireGestureHandler(gestures()[0] as never, [
        { state: State.BEGAN, translationX: 0, x: 30, y: 12 },
        { state: State.ACTIVE, translationX: 40, x: 70, y: 12 },
        { state: State.ACTIVE, translationX: 150, x: 180, y: 12 },
        { state: State.END, translationX: 150, x: 180, y: 12 },
      ])
    })
    expect(events).toEqual([
      'preview 1',
      'preview 2',
      'preview 5',
      'before-change 5',
      'input 5',
      'change 5',
      'preview ',
    ])
  })

  test('takes the score back to none where it is clearable and the score chosen is pressed', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} clearable defaultValue="3" label="Quality" />)
    await pressAt(110)
    expect(chosen(events)).toEqual(['before-change ', 'input ', 'change ', 'clear '])
  })

  test('presses the score chosen to nothing where it is not clearable', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} defaultValue="3" label="Quality" />)
    await pressAt(110)
    expect(chosen(events)).toEqual([])
  })

  test('moves by the keys without wrapping, Home and End to the ends, and clears with Backspace', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} clearable defaultValue="2" label="Quality" />)
    await key('ArrowRight')
    await key('ArrowUp')
    await key('End')
    await key('ArrowDown')
    await key('Home')
    await key('Backspace')
    expect(events.filter((one) => one.startsWith('change'))).toEqual([
      'change 3',
      'change 2',
      'change 5',
      'change 1',
      'change ',
    ])
    expect(events.at(-1)).toBe('clear ')
  })

  test('steps from the first score with the keys while none is given', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} label="Quality" />)
    await key('ArrowRight')
    expect(events.at(-1)).toBe('change 2')
  })

  test('steps with a screen reader, from the first step while none is given', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} label="Quality" />)
    await adjust('increment')
    await adjust('increment')
    await adjust('decrement')
    expect(events.filter((one) => one.startsWith('change'))).toEqual([
      'change 1',
      'change 2',
      'change 1',
    ])
  })

  test('offers no step below min, and keeps a refused choice from standing', async () => {
    const events: string[] = []
    await render(
      <Rating
        label="Quality"
        min={2}
        onBeforeChange={(event) => {
          events.push(`before-change ${event.detail.value}`)
          event.preventDefault()
        }}
        onChange={() => events.push('change')}
      />,
    )
    await pressAt(10)
    expect(events).toEqual(['before-change 2'])
  })

  test('takes no choice while disabled or read-only, and reads a read-only row as a picture', async () => {
    const { events, props } = heard()
    await render(<Rating {...props} defaultValue="3" disabled label="Quality" />)
    await pressAt(190)
    await adjust('increment')
    await render(<Rating {...props} defaultValue="4" label="Quality" readonly />)
    await adjust('increment')
    expect(events).toEqual([])
    expect(row().props.accessibilityRole).toBe('image')
    expect(row().props.accessibilityValue).toEqual({ text: '4 out of 5' })
  })

  test('says the score in value-text where it is given, and shows it under show-value', async () => {
    await render(
      <Rating
        defaultValue="4.2"
        label="Quality"
        readonly
        showValue
        valueText="4.2 out of 5, from 318 reviews"
      />,
    )
    expect(row().props.accessibilityValue).toEqual({ text: '4.2 out of 5, from 318 reviews' })
    expect(screen.queryAllByText('4.2', { includeHiddenElements: true }).length).toBe(1)
  })

  test('says its sentence once a required rating is cleared', async () => {
    await render(<Rating clearable defaultValue="3" label="Quality" required />)
    expect(screen.queryByText('Choose a rating to continue.')).toBeNull()
    await pressAt(110)
    expect(screen.getByText('Choose a rating to continue.')).toBeTruthy()
  })
})
