/*
 * The generated Tooltip, drawn from its real intermediate form in the layer
 * host: words that describe the trigger passed into it, a phone's hint, and
 * a bubble that a long press on the trigger shows where the trigger has no
 * long press of its own, which a press on the trigger, a close request, or a
 * touch outside takes down, unless `persist` keeps it through the press.
 * Floating UI's hook stands in for the one that measures views on a device,
 * as in `layer-place.jest.tsx`. `test:native` writes the component beside
 * this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { focusMoved, heardKey, heardTouch } from '../capabilities/focus-visible'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { styleOf } from './drawn'
import { HelixIconButton } from './icon-button/index.native'
import { HelixTooltip } from './tooltip/index.native'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: (options: {
      readonly middleware: readonly {
        readonly name?: string
        readonly options?: readonly unknown[]
      }[]
    }) => {
      const size = options.middleware.find((one) => one.name === 'size')?.options?.[0] as
        | { readonly apply: (state: Readonly<Record<string, unknown>>) => void }
        | undefined
      size?.apply({
        availableHeight: 240,
        availableWidth: 360,
        rects: { reference: { height: 40, width: 80, x: 20, y: 300 } },
      })
      return {
        middlewareData: {},
        placement: 'top',
        refs: {
          reference: { current: null },
          setFloating: () => undefined,
          setReference: () => undefined,
        },
        update: () => undefined,
        x: 20,
        y: 20,
      }
    },
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
/* Each view a press listens for keys on, as a hardware keyboard reaches it. */
let listened: unknown[] = []
let focused: FakeFocus<unknown>
let clock: FakeTimers
const real = timers()

const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, which the host waits for. */
const frames = () =>
  act(async () => {
    clock.runFrame()
    clock.runFrame()
  })

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The trigger's press. */
const trigger = () =>
  viewsWhere((props) => props.accessibilityRole === 'button' || props.role === 'button')[0]

/** The bubble, the layer's own view, which a screen reader hears as a tooltip. */
const bubble = () =>
  viewsWhere(
    (props) =>
      (props.role === 'tooltip' || props.accessibilityRole === 'tooltip') &&
      props.onAccessibilityEscape !== undefined,
  )[0]

const AT = { nativeEvent: { pageX: 100, pageY: 100 } }

/** Holds a finger on the trigger for `ms`, then lifts it over the trigger. */
const hold = async (ms: number) => {
  await act(async () => {
    fireEvent(trigger() as never, 'pressIn', AT)
  })
  await act(async () => clock.advance(ms))
  await act(async () => {
    fireEvent(trigger() as never, 'pressOut', AT)
    fireEvent.press(trigger() as never)
  })
  await frames()
}

/** A tooltip that says what a save does. */
const save = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixTooltip content="Save your work" {...props}>
    <HelixButton>Save</HelixButton>
  </HelixTooltip>
)

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  listened = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      listened.push(node)
      return fake.listen(node, hear)
    },
  }
  focused = fakeFocus()
  clock = fakeTimers()
  setKeys(keys)
  setFocus(focused)
  setTimers(clock)
})

afterEach(() => {
  setTimers(real)
})

describe('the generated Tooltip', () => {
  test('describes its trigger with its words, and draws no bubble at rest', async () => {
    await draw(save())
    expect(trigger()?.props.accessibilityHint).toBe('Save your work')
    expect(bubble()).toBeUndefined()
  })

  test('does not describe a trigger already named by its words', async () => {
    await draw(
      <HelixTooltip content="Settings">
        <HelixIconButton label="Settings">
          <Text>⚙</Text>
        </HelixIconButton>
      </HelixTooltip>,
    )
    expect(trigger()?.props.accessibilityLabel).toBe('Settings')
    expect(trigger()?.props.accessibilityHint).toBeUndefined()
  })

  test('shows on a long press of the trigger, leaving focus where it was, and the release presses nothing', async () => {
    const pressed = jest.fn()
    const heard: string[] = []
    await draw(
      <HelixTooltip
        content="Save your work"
        onToggle={(event: { detail: { newState: string } }) =>
          heard.push(`toggle ${event.detail.newState}`)
        }
      >
        <HelixButton onPress={pressed}>Save</HelixButton>
      </HelixTooltip>,
    )
    const before = focused.focused()
    await hold(500)
    expect(bubble()).toBeDefined()
    expect(heard).toEqual(['toggle open'])
    expect(pressed).not.toHaveBeenCalled()
    expect(focused.focused()).toBe(before)
  })

  test('is taken down by a press on its trigger, and kept by one under `persist`', async () => {
    const heard: string[] = []
    const toggled = (event: { detail: { newState: string } }) =>
      heard.push(`toggle ${event.detail.newState}`)
    await draw(save({ onToggle: toggled, open: true }))
    expect(bubble()).toBeDefined()
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    expect(heard).toEqual(['toggle closed'])
    heard.length = 0
    await draw(save({ onToggle: toggled, open: true, persist: true }))
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    expect(heard).toEqual([])
    expect(bubble()).toBeDefined()
  })

  test('shows as keyboard focus lands on its trigger and leaves as focus does, as on the web', async () => {
    const heard: string[] = []
    await draw(
      save({ onToggle: (event: { newState: string }) => heard.push(`toggle ${event.newState}`) }),
    )
    await act(async () => {
      focused.place(listened.at(-1) ?? null)
      heardKey()
    })
    await frames()
    expect(bubble()).toBeDefined()
    expect(heard).toEqual(['toggle open'])
    await act(async () => {
      focused.place(null)
      focusMoved()
    })
    await frames()
    expect(heard).toEqual(['toggle open', 'toggle closed'])
    heardTouch()
  })

  test('closes on Escape, and a refused close keeps it', async () => {
    const closing = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    await draw(save({ onBeforeClose: closing, open: true }))
    await act(async () => {
      keys.press(null, 'Escape')
    })
    expect(closing).toHaveBeenCalledTimes(1)
    expect(bubble()).toBeDefined()
  })

  test('does not show while disabled', async () => {
    await draw(save({ disabled: true }))
    await hold(600)
    expect(bubble()).toBeUndefined()
  })

  test('grows out of its point once it is placed, in the inverse ground', async () => {
    await draw(save({ open: true }))
    const style = styleOf(bubble() ?? { props: {} })
    expect(style.opacity).toBe(1)
    expect(style.backgroundColor).toBe(light['color-surface-inverse'])
  })
})
