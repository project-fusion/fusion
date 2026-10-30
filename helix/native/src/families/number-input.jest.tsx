/*
 * The generated Number Input, drawn from its real intermediate form: a
 * TextInput between two steppers, the number settled into its range as the
 * reader leaves the field or presses Enter, shown in its format while the
 * field has no focus, stepped by the keys, a screen reader, and the
 * steppers, again while one is held on the fake clock, and checked with the
 * sentences its props hold. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */

import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { Dimensions, Platform } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { HelixTheme } from '../theme/helix-theme'
import { HelixNumberInput, type HelixNumberInputProps } from './number-input/index.native'

let clock: FakeTimers
let keys: FakeKeys<unknown>
let before: ReturnType<typeof timers>
/** The nodes the keys capability listens on, which a key goes to. */
let listening: unknown[]

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  before = timers()
  clock = fakeTimers()
  setTimers(clock)
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

afterEach(() => {
  setTimers(before)
})

const NumberInput = (props: HelixNumberInputProps) => (
  <HelixTheme mode="light">
    <HelixNumberInput {...props} />
  </HelixTheme>
)

/** The one field a reader types into. */
const field = () => {
  const root = screen.root
  const found = root === null ? undefined : root.queryAll((node) => node.type === 'TextInput')[0]
  if (found === undefined) {
    throw new Error('no field is drawn')
  }
  return found
}

/** A stepper, by the start of its name, which the field's label follows. */
const stepper = (name: string) => screen.getByLabelText(new RegExp(`^${name}`))

/** Each event a handler heard, by its name, with the text its target held. */
const heard = (): { events: string[]; props: Partial<HelixNumberInputProps> } => {
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
      onInput: take('input'),
    },
  }
}

/** A quick tap on a stepper: the finger down, the press, and the finger up. */
const tap = async (name: string) => {
  const view = stepper(name)
  await fireEvent(view, 'pressIn', { nativeEvent: {} })
  await fireEvent.press(view)
  await fireEvent(view, 'pressOut', { nativeEvent: {} })
}

/** A key pressed on the field, as a hardware keyboard sends it: the first view that takes it. */
const key = async (name: string) => {
  await act(() => {
    const held = { alt: false, control: false, shift: false }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

describe('the generated Number Input', () => {
  test('is a field between two steppers, each named and pressable', async () => {
    await render(<NumberInput defaultValue="3" label="Guests" min={1} />)
    expect(field().props.value).toBe('3')
    expect(stepper('Decrease').props.accessibilityRole).toBe('button')
    expect(stepper('Increase').props.accessibilityRole).toBe('button')
  })

  test("names each stepper by its words and then the field's label, as the web does", async () => {
    await render(<NumberInput label="Guests" />)
    expect(screen.getByLabelText('Decrease Guests').props.accessibilityRole).toBe('button')
    expect(screen.getByLabelText('Increase Guests').props.accessibilityRole).toBe('button')
  })

  test('names each stepper by its words alone where the field has no label', async () => {
    await render(<NumberInput decrementLabel="Fewer" incrementLabel="More" />)
    expect(screen.getByLabelText('Fewer').props.accessibilityRole).toBe('button')
    expect(screen.getByLabelText('More').props.accessibilityRole).toBe('button')
  })

  test('asks before each edit and settles the number into its range as the reader leaves', async () => {
    const { events, props } = heard()
    await render(<NumberInput {...props} label="Guests" max={10} />)
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), '1')
    await fireEvent.changeText(field(), '15')
    await fireEvent(field(), 'blur')
    expect(events).toEqual([
      'before-change 1',
      'input 1',
      'before-change 15',
      'input 15',
      'before-change 10',
      'input 10',
      'change 10',
    ])
    expect(field().props.value).toBe('10')
  })

  test('Enter settles and commits a number that settling moved', async () => {
    const { events, props } = heard()
    await render(<NumberInput {...props} label="Guests" step={5} />)
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), '7')
    events.length = 0
    await fireEvent(field(), 'submitEditing')
    expect(events).toEqual(['before-change 5', 'input 5', 'change 5'])
  })

  test('shows its format while the field has no focus, and the number while it has', async () => {
    await render(
      <NumberInput
        defaultValue="1200"
        formatOptions={{ currency: 'USD', style: 'currency' }}
        label="Price"
        locale="en-US"
      />,
    )
    expect(field().props.value).toBe('$1,200.00')
    await fireEvent(field(), 'focus')
    expect(field().props.value).toBe('1200')
  })

  test('the steppers step it, and each step sends before-change, input, and change', async () => {
    const { events, props } = heard()
    await render(<NumberInput {...props} defaultValue="2" label="Guests" />)
    await tap('Increase')
    await tap('Decrease')
    await tap('Decrease')
    expect(events).toEqual([
      'before-change 3',
      'input 3',
      'change 3',
      'before-change 2',
      'input 2',
      'change 2',
      'before-change 1',
      'input 1',
      'change 1',
    ])
  })

  test('a held stepper steps again after the delay and at each interval, and stops at an end', async () => {
    await render(<NumberInput defaultValue="0" label="Guests" max={6} />)
    await fireEvent(stepper('Increase'), 'pressIn', { nativeEvent: {} })
    expect(field().props.value).toBe('1')
    await act(() => clock.advance(400))
    expect(field().props.value).toBe('2')
    await act(() => clock.advance(60 * 3))
    expect(field().props.value).toBe('5')
    await act(() => clock.advance(60 * 5))
    expect(field().props.value).toBe('6')
    expect(stepper('Increase').props.accessibilityState).toMatchObject({ disabled: true })
    expect(clock.pending().timeouts).toBe(0)
  })

  test('letting go of a held stepper stops it', async () => {
    await render(<NumberInput defaultValue="0" label="Guests" />)
    await fireEvent(stepper('Increase'), 'pressIn', { nativeEvent: {} })
    await act(() => clock.advance(460))
    await fireEvent(stepper('Increase'), 'pressOut', { nativeEvent: {} })
    await act(() => clock.advance(1000))
    expect(field().props.value).toBe('3')
  })

  test('the keys step it: a step, a large step, and the ends where there are some', async () => {
    await render(
      <NumberInput defaultValue="10" label="Seats" largeStep={5} max={50} min={0} step={2} />,
    )
    await key('ArrowUp')
    expect(field().props.value).toBe('12')
    await key('PageDown')
    expect(field().props.value).toBe('2')
    await key('End')
    expect(field().props.value).toBe('50')
    await key('Home')
    expect(field().props.value).toBe('0')
  })

  test('a refused step leaves the number where it was', async () => {
    await render(
      <NumberInput
        defaultValue="4"
        label="Guests"
        onBeforeChange={(event) => event.preventDefault()}
      />,
    )
    await tap('Increase')
    await key('ArrowDown')
    expect(field().props.value).toBe('4')
  })

  test('disabled or read-only, nothing steps it and the steppers are disabled', async () => {
    await render(<NumberInput defaultValue="4" disabled label="Guests" />)
    expect(stepper('Increase').props.accessibilityState).toMatchObject({ disabled: true })
    await render(<NumberInput defaultValue="4" label="Guests" readonly />)
    expect(stepper('Decrease').props.accessibilityState).toMatchObject({ disabled: true })
    expect(field().props.showSoftInputOnFocus).toBe(false)
    await key('ArrowUp')
    expect(field().props.value).toBe('4')
  })

  test('says what is wrong with the number in the sentences its props hold', async () => {
    const ref = createRef<FieldHandle>()
    await render(<NumberInput defaultValue="12" label="Guests" max={10} ref={ref as never} />)
    await act(() => {
      expect(ref.current?.validate()).toBe(false)
    })
    expect(screen.getByText('Value must be 10 or less.')).toBeTruthy()
    await render(
      <NumberInput
        badInputMessage="Type digits."
        defaultValue="abc"
        label="Guests"
        ref={ref as never}
      />,
    )
    await act(() => {
      ref.current?.validate()
    })
    expect(screen.getByText('Type digits.')).toBeTruthy()
  })

  test('offers the keypad its range asks for, and is a spin button on Android', async () => {
    await render(<NumberInput label="Guests" min={0} step={1} />)
    expect(field().props.inputMode).toBe('numeric')
    if (Platform.OS === 'ios') {
      expect(field().props.accessibilityRole).toBeUndefined()
    } else {
      expect(field().props.accessibilityRole).toBe('spinbutton')
    }
  })
})
