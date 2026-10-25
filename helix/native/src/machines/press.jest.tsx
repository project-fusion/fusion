import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setTimers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Family } from '../style/form'
import { type PressPart, usePress } from './press'

/** A Button's form, as far as press reads it. */
const BUTTON = {
  api: {
    events: [{ name: 'press' }],
    props: [
      { default: false, name: 'disabled' },
      { default: false, name: 'pending' },
    ],
    states: [],
  },
  name: 'button',
  rules: [],
  tag: 'helix-button',
  version: '1.0',
} as unknown as Family

const USE: MachineUse = {
  bind: {
    disabled: { prop: 'disabled' },
    part: { part: 'button' },
    pending: { prop: 'pending' },
    sends: { event: 'press' },
  },
  machine: 'press',
}

/** A part drawn with what press gives it, saying whether it is held down. */
const Button = (
  props: Readonly<Record<string, unknown>> & { readonly at?: PressPart; readonly use?: MachineUse },
) => {
  const part = usePress(BUTTON, props, props.use ?? USE, {}, props.at).parts.button
  return (
    <Pressable accessibilityRole="button" {...part?.view}>
      <Text>{part?.states?.active === true ? 'down' : 'up'}</Text>
    </Pressable>
  )
}

const TOUCH = { nativeEvent: { pageX: 10, pageY: 10 } }

let timers = fakeTimers()
let keys: FakeKeys<unknown> = fakeKeys()
/* The parts listening for keys, in the order they started. */
let heard: unknown[] = []

beforeEach(() => {
  timers = fakeTimers()
  setTimers(timers)
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      heard.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

/** Presses `key` on the part listening for keys, and answers whether the press took it. */
const pressKey = async (key: string, held: Parameters<FakeKeys<unknown>['press']>[2] = {}) => {
  let took = false
  await act(() => {
    took = keys.press(heard[0], key, held)
  })
  return took
}

const KEYS: PressPart = { keys: true }

afterEach(() => {
  timers.advance(1000)
})

describe('usePress', () => {
  test('is held down while a finger is, and tells the press it makes once it lifts over the part', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress} />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    expect(screen.getByText('down')).toBeTruthy()
    await fireEvent(screen.getByRole('button'), 'pressOut', TOUCH)
    await fireEvent.press(screen.getByRole('button'))
    expect(screen.getByText('up')).toBeTruthy()
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPress.mock.calls[0]?.[0]).toMatchObject({ detail: { pointerType: 'touch' } })
  })

  test('takes a tap whose press-out comes after its press, as a quick tap on a device does', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress} />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    await fireEvent.press(screen.getByRole('button'))
    expect(screen.getByText('up')).toBeTruthy()
    await fireEvent(screen.getByRole('button'), 'pressOut', TOUCH)
    await act(() => timers.advance(0))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPress.mock.calls[0]?.[0]).toMatchObject({ detail: { pointerType: 'touch' } })
  })

  test('tells nothing where the finger lifts away from the part', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress} />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    await fireEvent(screen.getByRole('button'), 'pressOut', TOUCH)
    await act(() => timers.advance(0))
    expect(screen.getByText('up')).toBeTruthy()
    expect(onPress).not.toHaveBeenCalled()
  })

  test('names a press nothing started virtual, as a screen reader’s is', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress} />)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress.mock.calls[0]?.[0]).toMatchObject({ detail: { pointerType: 'virtual' } })
  })

  test('takes no press while disabled', async () => {
    const onPress = jest.fn()
    await render(<Button disabled onPress={onPress} />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    expect(screen.getByText('up')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  test('takes a press and swallows its click while pending', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress} pending />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    expect(screen.getByText('down')).toBeTruthy()
    await fireEvent(screen.getByRole('button'), 'pressOut', TOUCH)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  test('reads a prop that changes partway through a press', async () => {
    const onPress = jest.fn()
    const view = await render(<Button onPress={onPress} />)
    await fireEvent(screen.getByRole('button'), 'pressIn', TOUCH)
    await view.rerender(<Button onPress={onPress} pending />)
    await fireEvent(screen.getByRole('button'), 'pressOut', TOUCH)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  test('hears Enter and Space on its part, and names each press keyboard', async () => {
    const onPress = jest.fn()
    await render(<Button at={KEYS} onPress={onPress} />)
    expect(await pressKey('Enter')).toBe(true)
    expect(await pressKey(' ')).toBe(true)
    expect(onPress.mock.calls.map((call) => call[0])).toEqual([
      expect.objectContaining({ detail: { pointerType: 'keyboard' } }),
      expect.objectContaining({ detail: { pointerType: 'keyboard' } }),
    ])
  })

  /* A checkbox's form names `keys: 'space'`, as a native checkbox on the web
     takes Space alone. */
  /* Taken, so the platform does not press the view with it: Enter leaves a
     checkbox as it was on the web. */
  test('hears the one key its form names, and takes the other without a press', async () => {
    const onPress = jest.fn()
    const space: MachineUse = { ...USE, bind: { ...USE.bind, keys: { key: ' ' } } }
    await render(<Button at={KEYS} onPress={onPress} use={space} />)
    expect(await pressKey('Enter')).toBe(true)
    expect(onPress).not.toHaveBeenCalled()
    expect(await pressKey(' ')).toBe(true)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('presses once for a Space held down, which repeats', async () => {
    const onPress = jest.fn()
    await render(<Button at={KEYS} onPress={onPress} />)
    await pressKey(' ')
    expect(await pressKey(' ', { repeat: true })).toBe(true)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('leaves alone every other key, and a key something nearer took', async () => {
    const onPress = jest.fn()
    await render(<Button at={KEYS} onPress={onPress} />)
    expect(await pressKey('a')).toBe(false)
    expect(await pressKey('Enter', { claimed: true })).toBe(false)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('leaves the keys to the platform while disabled, and swallows their press while pending', async () => {
    const onPress = jest.fn()
    const view = await render(<Button at={KEYS} disabled onPress={onPress} />)
    expect(await pressKey('Enter')).toBe(false)
    await view.rerender(<Button at={KEYS} onPress={onPress} pending />)
    expect(await pressKey('Enter')).toBe(true)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('hears no key where its part leaves the keys to something else', async () => {
    await render(<Button onPress={jest.fn()} />)
    expect(heard).toEqual([])
  })

  test('reads what a set lays over the part in place of the prop it names', async () => {
    const onPress = jest.fn()
    await render(<Button at={{ states: { disabled: false } }} disabled onPress={onPress} />)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
