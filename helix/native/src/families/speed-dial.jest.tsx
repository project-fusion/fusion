/*
 * The generated Speed Dial, drawn from its real intermediate forms in the
 * layer host: a round trigger that opens its actions beside it, focus on the
 * first of them, an action that asks with `before-select`, says `select`,
 * and closes the dial once it stands, Down and Up that open it on the first action or the last, and a
 * trigger whose own press stands under `open-on="long-press"`, which a
 * finger held still opens instead, and actions that arrive one after another,
 * nearest the trigger first. Floating UI's hook stands in for the one
 * that measures views on a device. `test:native` writes the components
 * beside this file.
 */
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
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
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixSpeedDial, HelixSpeedDialGroup, HelixSpeedDialItem } from './speed-dial/index.native'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    /* The room Floating UI's `size` measures, which places the actions. */
    useFloating: (options: {
      readonly middleware: readonly { readonly name?: string; readonly options?: unknown[] }[]
    }) => {
      const size = options.middleware.find((one) => one.name === 'size')?.options?.[0] as
        | { readonly apply: (state: Readonly<Record<string, unknown>>) => void }
        | undefined
      size?.apply({
        availableHeight: 400,
        availableWidth: 360,
        rects: { reference: { height: 56, width: 56, x: 280, y: 600 } },
      })
      return {
        middlewareData: {},
        placement: 'top-end',
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
let focus: FakeFocus<unknown>
let clock: FakeTimers
const real = timers()
/* Each press's view, in the order it first listened for keys. */
let listened: unknown[] = []

const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, which the host and the focus scope wait for. */
const frames = () =>
  act(async () => {
    clock.runFrame()
    clock.runFrame()
    await new Promise<void>((done) => setTimeout(done, 20))
  })

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

const roleOf = (props: Readonly<Record<string, unknown>>) => props.role ?? props.accessibilityRole

/** The drawn trigger, a button named Actions. */
const trigger = () =>
  viewsWhere((props) => roleOf(props) === 'button' && props.accessibilityLabel === 'Actions')[0]

/** The actions' layer, a menu. */
const actions = () =>
  viewsWhere((props) => roleOf(props) === 'menu' && props.onAccessibilityEscape !== undefined)[0]

/** The action whose words are `words`. */
const action = (words: string) =>
  viewsWhere((props) => roleOf(props) === 'menuitem').find(
    (node) => node.queryAll((inner) => inner.props.children === words).length > 0,
  )

const AT = { nativeEvent: { pageX: 100, pageY: 100 } }

/** A dial of three actions. */
const dial = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixSpeedDial {...props}>
    <HelixSpeedDialItem shortcut="mod+s" value="share">
      Share
    </HelixSpeedDialItem>
    <HelixSpeedDialItem value="copy">Duplicate</HelixSpeedDialItem>
    <HelixSpeedDialItem value="delete">Delete</HelixSpeedDialItem>
  </HelixSpeedDial>
)

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  listened = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!listened.includes(node)) {
        listened.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  focus = fakeFocus()
  clock = fakeTimers()
  setKeys(keys)
  setFocus(focus)
  setTimers(clock)
})

afterEach(() => {
  setTimers(real)
})

type Told = { detail: Readonly<Record<string, unknown>>; preventDefault: () => void }

describe('the generated Speed Dial', () => {
  test('draws a trigger named by its label, which a press opens and says is expanded', async () => {
    const heard: string[] = []
    await draw(
      dial({
        onBeforeOpen: () => heard.push('before-open'),
        onToggle: (event: { newState: string }) => heard.push(`toggle ${event.newState}`),
      }),
    )
    expect(trigger()?.props.accessibilityState?.expanded).toBe(false)
    expect(actions()).toBeUndefined()
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(heard).toEqual(['before-open', 'toggle open'])
    expect(actions()).toBeDefined()
    expect(trigger()?.props.accessibilityState?.expanded).toBe(true)
  })

  test('its actions arrive one after another once placed, nearest the trigger first', async () => {
    /* The delay each action's own view waits, by its words, from the first
       view under the action that moves, once the dial is open. */
    const delays = async () => {
      await draw(dial())
      await act(async () => {
        fireEvent.press(trigger() as never)
      })
      await frames()
      return ['Share', 'Duplicate', 'Delete'].map((words) => {
        const moving = viewsWhere((props) => {
          const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
          return Array.isArray(style.transitionDelay)
        }).filter((node) => node.queryAll((inner) => inner.props.children === words).length > 0)
        const style = Object.assign({}, ...[moving[0]?.props.style].flat(3)) as {
          readonly transitionDelay?: readonly number[]
        }
        return style.transitionDelay?.[0]
      })
    }
    /* The column runs upward from the trigger, so Delete, the last, is nearest it. */
    expect(await delays()).toEqual([80, 40, 0])
    /* Under reduced motion they are simply there: nothing waits. */
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    expect(await delays()).toEqual([0, 0, 0])
    setEnvironment(fakeEnvironment())
  })

  test('choosing an action asks, says select, and closes the dial, and a refused one keeps it', async () => {
    const heard: string[] = []
    await draw(
      dial({
        onBeforeClose: () => heard.push('before-close'),
        onBeforeSelect: (event: Told) => heard.push(`before-select ${String(event.detail.value)}`),
        onSelect: (event: Told) => heard.push(`select ${String(event.detail.value)}`),
      }),
    )
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    await act(async () => {
      fireEvent.press(action('Duplicate') as never)
    })
    await frames()
    expect(heard).toEqual(['before-select copy', 'select copy', 'before-close'])
    heard.length = 0
    await draw(dial({ onBeforeSelect: (event: Told) => event.preventDefault() }))
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    await act(async () => {
      fireEvent.press(action('Duplicate') as never)
    })
    await frames()
    expect(action('Duplicate')).toBeDefined()
  })

  test('Down on the trigger opens it on the first action, and Up on the last', async () => {
    await draw(dial())
    const [own] = listened
    await act(() => {
      expect(keys.press(own, 'ArrowDown')).toBe(true)
    })
    await frames()
    expect(actions()).toBeDefined()
    const first = focus.focused()
    expect(first).not.toBeNull()
    await act(() => {
      keys.press(first, 'Escape')
    })
    await frames()
    expect(actions()).toBeUndefined()
    await act(() => {
      expect(keys.press(own, 'ArrowUp')).toBe(true)
    })
    await frames()
    expect(focus.focused()).not.toBe(first)
  })

  test('under open-on="long-press", a quick press is the trigger’s own and a held one opens it', async () => {
    await draw(dial({ openOn: 'long-press' }))
    expect(trigger()?.props.accessibilityHint).toBe(
      'Long press or press Alt+Down to show the actions',
    )
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(actions()).toBeUndefined()
    await act(async () => {
      fireEvent(trigger() as never, 'pressIn', AT)
    })
    await act(async () => clock.advance(500))
    await act(async () => {
      fireEvent(trigger() as never, 'pressOut', AT)
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(actions()).toBeDefined()
  })

  test('draws an action’s shortcut in the keyboard’s glyphs, and names a group by its label', async () => {
    await draw(
      <HelixSpeedDial defaultOpen>
        <HelixSpeedDialGroup label="Share to">
          <HelixSpeedDialItem shortcut="mod+s" value="mail">
            Mail
          </HelixSpeedDialItem>
        </HelixSpeedDialGroup>
      </HelixSpeedDial>,
    )
    expect(viewsWhere((props) => props.children === 'Share to').length).toBeGreaterThan(0)
    expect(viewsWhere((props) => props.accessibilityLabel === 'Share to')[0]).toBeDefined()
    const drawnKeys = viewsWhere((props) => props.children === '⌘S' || props.children === 'Ctrl+S')
    expect(drawnKeys.length).toBeGreaterThan(0)
  })
})
