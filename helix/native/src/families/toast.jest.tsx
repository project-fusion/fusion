/*
 * The generated Toast, drawn from its real intermediate form in the layer
 * host: a stack above every other layer that stands open while it holds a
 * message, where each message says its words as it shows, assertively for a
 * `danger` one, spends its `duration` on core's countdown while no touch
 * holds the stack, waits past the stack's `max-visible`, and closes on its
 * dismiss button, Escape on that button, or its clock, with the stack
 * hearing each dismissal after the message. `test:native` writes the
 * component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { dark } from '../theme/dark.generated'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { styleOf } from './drawn'
import { HelixToast, HelixToastItem } from './toast/index.native'

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
/* The views a part listens for keys on, in the order they started. */
let listened: unknown[] = []
let announced: FakeAnnounce
let clock: FakeTimers
const real = timers()

/** The app, with what the spec draws in it, under the layer host. */
const app = (content: ReactNode) => (
  <GestureHandlerRootView>
    <ThemeProvider mode="light" rem={16} tokens={light}>
      <LayerHostView>
        <Text>Page</Text>
        {content}
      </LayerHostView>
    </ThemeProvider>
  </GestureHandlerRootView>
)

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
}

const redraw = async (content: ReactNode) => {
  await drawn?.rerender(app(content))
}

/** Moves the fake clock, inside `act`. */
const wait = (ms: number) =>
  act(async () => {
    clock.advance(ms)
  })

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The text drawn with `words`, where it is drawn. */
const textOf = (words: string) =>
  viewsWhere(() => true).find(
    (node) =>
      node.type === 'Text' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

/** The dismiss buttons drawn, in order. */
const dismissButtons = () =>
  viewsWhere((props) => props.accessibilityLabel === 'Dismiss' && props.accessible === true)

/** The stack's layer view, which hears a screen reader's escape. */
const stack = () => viewsWhere((props) => props.onAccessibilityEscape !== undefined)[0]

type Heard = (event: { detail: { label?: string }; preventDefault: () => void }) => void

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
  announced = fakeAnnounce()
  clock = fakeTimers()
  setKeys(keys)
  setFocus(fakeFocus())
  setAnnounce(announced)
  setTimers(clock)
  setEnvironment(fakeEnvironment({ insets: { bottom: 34, left: 0, right: 0, top: 59 } }))
})

afterEach(() => {
  setTimers(real)
})

describe('the generated Toast', () => {
  test('stands open over the app while it holds a message, and takes no touch of its own', async () => {
    await draw(<HelixToast />)
    expect(stack()).toBeUndefined()
    await redraw(
      <HelixToast>
        <HelixToastItem>Project saved.</HelixToastItem>
      </HelixToast>,
    )
    expect(textOf('Project saved.')).toBeDefined()
    expect(stack()?.props.pointerEvents).toBe('box-none')
  })

  test('says each message as it shows, and a danger one assertively', async () => {
    await draw(
      <HelixToast>
        <HelixToastItem tone="success">Project saved.</HelixToastItem>
        <HelixToastItem heading={<Text>Upload failed</Text>} tone="danger">
          Could not reach the server.
        </HelixToastItem>
      </HelixToast>,
    )
    expect(announced.said).toEqual([
      { message: 'Success. Project saved.', urgency: 'polite' },
      { message: 'Error. Upload failed. Could not reach the server.', urgency: 'assertive' },
    ])
  })

  test('closes on its dismiss button, and the stack hears the dismissal after the message', async () => {
    const order: string[] = []
    const own: Heard = (event) => order.push(`message ${event.detail.label}`)
    const around: Heard = (event) => order.push(`stack ${event.detail.label}`)
    await draw(
      <HelixToast onDismiss={around}>
        <HelixToastItem dismissible onDismiss={own}>
          Project saved.
        </HelixToastItem>
      </HelixToast>,
    )
    await act(async () => {
      fireEvent.press(dismissButtons()[0] as never)
    })
    /* The exit runs on a real timeout of its transition. */
    await act(() => new Promise<void>((done) => setTimeout(done, 300)))
    expect(order).toEqual(['message Project saved.', 'stack Project saved.'])
    expect(hidden(textOf('Project saved.') as never)).toBe(true)
  })

  test('keeps a message the stack refuses to let go', async () => {
    const refuse: Heard = (event) => event.preventDefault()
    await draw(
      <HelixToast onDismiss={refuse}>
        <HelixToastItem dismissible>Project saved.</HelixToastItem>
      </HelixToast>,
    )
    await act(async () => {
      fireEvent.press(dismissButtons()[0] as never)
    })
    await wait(400)
    expect(hidden(textOf('Project saved.') as never)).toBe(false)
  })

  test('closes the message whose dismiss button Escape is pressed on', async () => {
    const heard = jest.fn()
    await draw(
      <HelixToast>
        <HelixToastItem dismissible onDismiss={heard}>
          Project saved.
        </HelixToastItem>
      </HelixToast>,
    )
    let taken = false
    await act(async () => {
      for (const node of new Set(listened)) {
        taken = keys.press(node, 'Escape') || taken
      }
    })
    expect(taken).toBe(true)
    expect(heard).toHaveBeenCalledTimes(1)
  })

  test('spends its duration, and a touch on any message holds every clock', async () => {
    const heard = jest.fn()
    await draw(
      <HelixToast>
        <HelixToastItem duration={1000} onDismiss={heard}>
          Project saved.
        </HelixToastItem>
        <HelixToastItem duration={1000} onDismiss={heard}>
          Two files were uploaded.
        </HelixToastItem>
      </HelixToast>,
    )
    const touch = (name: 'onTouchEnd' | 'onTouchStart') =>
      act(async () => {
        const first = viewsWhere((props) => typeof props.onTouchStart === 'function')[0]
        ;(first?.props[name] as ((event: object) => void) | undefined)?.({})
      })
    await touch('onTouchStart')
    await wait(2000)
    expect(heard).not.toHaveBeenCalled()
    await touch('onTouchEnd')
    await wait(1000)
    expect(heard).toHaveBeenCalledTimes(2)
  })

  test('holds back the messages past max-visible until one before them goes', async () => {
    const queued = (open: boolean) => (
      <HelixToast maxVisible={1}>
        <HelixToastItem open={open}>Project saved.</HelixToastItem>
        <HelixToastItem>Two files were uploaded.</HelixToastItem>
      </HelixToast>
    )
    await draw(queued(true))
    expect(announced.said.map((one) => one.message)).toEqual(['Project saved.'])
    const second = textOf('Two files were uploaded.')
    expect(second === undefined || styleOf(second).display === 'none' || hidden(second)).toBe(true)
    await redraw(queued(false))
    await wait(400)
    expect(announced.said.map((one) => one.message)).toEqual([
      'Project saved.',
      'Two files were uploaded.',
    ])
  })

  test("starts a waiting message's clock once the one before it goes", async () => {
    const heard: string[] = []
    await draw(
      <HelixToast maxVisible={1}>
        <HelixToastItem duration={1000} onDismiss={() => heard.push('saved')}>
          Project saved.
        </HelixToastItem>
        <HelixToastItem duration={1000} onDismiss={() => heard.push('uploaded')}>
          Two files were uploaded.
        </HelixToastItem>
      </HelixToast>,
    )
    await wait(1000)
    expect(heard).toEqual(['saved'])
    await wait(999)
    expect(heard).toEqual(['saved'])
    await wait(1)
    expect(heard).toEqual(['saved', 'uploaded'])
  })

  test('draws its messages in the scheme opposite the page, unless it names its own mode', async () => {
    const surface = (mode?: string) => (
      <HelixToast {...(mode === undefined ? {} : { 'data-color-mode': mode })}>
        <HelixToastItem>Project saved.</HelixToastItem>
      </HelixToast>
    )
    const fill = () =>
      viewsWhere((props) => {
        const style = styleOf({ props } as never)
        return typeof style.backgroundColor === 'string' && style.borderRadius !== undefined
      })
        .map((node) => styleOf(node).backgroundColor)
        .find((color) => color !== 'transparent')
    await draw(surface())
    expect(fill()).toBe(dark['color-surface-overlay'])
    await redraw(surface('light'))
    expect(fill()).toBe(light['color-surface-overlay'])
  })
})

/** Whether a node is hidden from view and from a screen reader, as a waiting message is. */
const hidden = (node: { readonly parent?: unknown; readonly props: Record<string, unknown> }) => {
  let at: { readonly parent?: unknown; readonly props: Record<string, unknown> } | null = node
  while (at) {
    if (styleOf(at as never).display === 'none') {
      return true
    }
    at = (at.parent as typeof at | undefined) ?? null
  }
  return false
}
