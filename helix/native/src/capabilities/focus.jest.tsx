import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { createRef } from 'react'
import {
  AccessibilityInfo,
  type HostInstance,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native'
import { type FocusHolder, focusThrough, nativeFocus } from './focus'

/**
 * Says whether `node` is still drawn, as a device's renderer does.
 *
 * **React Native's Jest preset draws each part as a mock with none of the
 * element methods**, so the spec gives each node the `isConnected` a device's
 * renderer would.
 */
const connect = (node: HostInstance, connected = true): HostInstance => {
  Object.defineProperty(node, 'isConnected', { configurable: true, value: connected })
  return node
}

/** Draws a view and hands back its host instance. */
const drawnView = async (): Promise<HostInstance> => {
  const ref = createRef<HostInstance>()
  await render(<View accessible ref={ref} />)
  return connect(ref.current as HostInstance)
}

/** Draws a text input and hands back its host instance. */
const drawnInput = async (): Promise<HostInstance> => {
  const ref = createRef<TextInputInstance>()
  await render(<TextInput ref={ref} />)
  return connect(ref.current as TextInputInstance)
}

/**
 * A stand-in for the keys module, holding focus as the iOS module does: on
 * the tag `focus` names, until `letGo`, as the focus system moving focus
 * elsewhere does.
 */
const fakeHolder = () => {
  const state = { held: null as number | null }
  const focus = jest.fn((tag: number) => {
    state.held = tag
  })
  const holder: FocusHolder = { focus, focused: () => state.held }
  return {
    focus,
    holder,
    letGo: () => {
      state.held = null
    },
  }
}

/** Tags as a spec stands them in, one for each node it draws, in order. */
const tagsFor = (...nodes: HostInstance[]) => {
  return (node: HostInstance): number | null => {
    const at = nodes.indexOf(node)
    return at === -1 ? null : 10 + at
  }
}

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeFocus', () => {
  test('moves keyboard focus and the screen reader’s focus to the node', async () => {
    const node = await drawnView()
    const focus = jest.spyOn(node, 'focus')
    const reader = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent')
    nativeFocus.focus(node, false)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(reader).toHaveBeenCalledTimes(1)
    expect(reader).toHaveBeenCalledWith(node, 'focus')
  })

  test('moves focus the same way where scrolling is prevented, since focus() takes no options', async () => {
    const node = await drawnInput()
    const focus = jest.spyOn(node, 'focus')
    nativeFocus.focus(node, true)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledWith()
  })

  test('reads the text input that has the keyboard as focused', async () => {
    const node = await drawnInput()
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(node)
    expect(nativeFocus.focused()).toBe(node)
  })

  test('reads null for a view where the keys module is missing, as in Jest and Expo Go', async () => {
    const node = await drawnView()
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(undefined)
    nativeFocus.focus(node, false)
    expect(nativeFocus.focused()).toBeNull()
  })
})

describe('focusThrough', () => {
  test('has the module hold focus on the node’s view, and reads the node back as focused', async () => {
    const node = await drawnView()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(node))
    const own = jest.spyOn(node, 'focus')
    focus.focus(node, false)
    expect(own).toHaveBeenCalledTimes(1)
    expect(fake.focus.mock.calls).toEqual([[10]])
    expect(focus.focused()).toBe(node)
  })

  test('reads the node focus last moved to, as the next key pressed starts there', async () => {
    const first = await drawnView()
    const second = await drawnView()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(first, second))
    focus.focus(first, false)
    focus.focus(second, false)
    expect(fake.focus.mock.calls).toEqual([[10], [11]])
    expect(focus.focused()).toBe(second)
  })

  test('reads null once the module lets go of the view, as where the focus system moves focus away', async () => {
    const node = await drawnView()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(node))
    focus.focus(node, false)
    fake.letGo()
    expect(focus.focused()).toBeNull()
  })

  test('reads null for a node that is no longer drawn', async () => {
    const node = await drawnView()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(node))
    focus.focus(node, false)
    connect(node, false)
    expect(focus.focused()).toBeNull()
  })

  test('reads the text input with the keyboard before the node the module holds', async () => {
    const node = await drawnView()
    const input = await drawnInput()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(node, input))
    focus.focus(node, false)
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(input)
    expect(focus.focused()).toBe(input)
  })

  test('has the text input with the keyboard give it up where focus moves to another node', async () => {
    const node = await drawnView()
    const input = await drawnInput()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(node, input))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(input)
    const blur = jest.spyOn(TextInput.State, 'blurTextInput').mockImplementation(() => undefined)
    focus.focus(node, false)
    expect(blur.mock.calls).toEqual([[input]])
  })

  test('leaves a text input its keyboard where focus moves to that input', async () => {
    const input = await drawnInput()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, tagsFor(input))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(input)
    const blur = jest.spyOn(TextInput.State, 'blurTextInput').mockImplementation(() => undefined)
    focus.focus(input, false)
    expect(fake.focus.mock.calls).toEqual([[10]])
    expect(blur).not.toHaveBeenCalled()
  })

  test('holds nothing for a node React Native draws no view for', async () => {
    const node = await drawnView()
    const fake = fakeHolder()
    const focus = focusThrough(fake.holder, () => null)
    focus.focus(node, false)
    expect(fake.focus).not.toHaveBeenCalled()
    expect(focus.focused()).toBeNull()
  })

  test('moves only the host instance’s focus where the module cannot hold focus, as one built before it could', async () => {
    const node = await drawnView()
    const input = await drawnInput()
    const focus = focusThrough({}, tagsFor(node, input))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(input)
    const blur = jest.spyOn(TextInput.State, 'blurTextInput').mockImplementation(() => undefined)
    const own = jest.spyOn(node, 'focus')
    focus.focus(node, false)
    expect(own).toHaveBeenCalledTimes(1)
    expect(blur).not.toHaveBeenCalled()
    expect(focus.focused()).toBe(input)
  })
})
