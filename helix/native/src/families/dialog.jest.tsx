/*
 * The generated Dialog, drawn from its real intermediate form in the layer
 * host: a modal panel named by its label, its title, or its fallback, that
 * a press on its scrim, a close request, or its close control asks to close,
 * as `closedby` and `persistent` allow; that swells where it keeps a press
 * on the scrim; that is a sheet below a window of 30rem; and that says its
 * name as it opens. `test:native` writes the component beside this file.
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
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixDialog } from './dialog/index.native'
import { styleOf } from './drawn'

/** The window's width as Jest's React Native gives it, and a rem at which it is narrower than 30rem. */
const NARROW = Math.ceil(Dimensions.get('window').width / 30) + 1

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let announced: FakeAnnounce
/* The timers the app runs on, which a spec that moves the clock puts back. */
const real = timers()

/** The app, with what the spec draws in it, under the layer host, at `rem`. */
const app = (content: ReactNode, rem = 16) => (
  <ThemeProvider rem={rem} tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, which the host and the focus scope wait for. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: ReactNode, rem?: number) => {
  drawn = await render(app(content, rem))
  await frames()
}

const redraw = async (content: ReactNode) => {
  await drawn?.rerender(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The panel, the layer's own view, which a screen reader hears as its role. */
const panel = (role = 'dialog') =>
  viewsWhere(
    (props) =>
      (props.role === role || props.accessibilityRole === role) &&
      props.onAccessibilityEscape !== undefined,
  )[0]

/** The scrim a modal dialog draws under itself. */
const scrim = () =>
  viewsWhere((props) => props.importantForAccessibility === 'no' && props.accessible === false)[0]

/** Whether the words are drawn in the layer host. */
const shows = (words: string) =>
  viewsWhere(() => true).some(
    (node) =>
      node.type === 'Text' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

/** A dialog asking to rename a file, with one action. */
const rename = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixDialog label="Rename the file" open {...props}>
    <Text>Choose a new name for the file.</Text>
  </HelixDialog>
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  setKeys(keys)
  setFocus(fakeFocus())
  setAnnounce(announced)
  setEnvironment(fakeEnvironment({ insets: { bottom: 34, left: 0, right: 0, top: 59 } }))
})

afterEach(() => {
  setTimers(real)
})

describe('the generated Dialog', () => {
  test('draws nothing while closed, and opens over the app holding the reader, named by its label', async () => {
    await draw(rename({ open: false }))
    expect(shows('Choose a new name for the file.')).toBe(false)
    await redraw(rename())
    expect(shows('Choose a new name for the file.')).toBe(true)
    expect(panel()?.props.accessibilityViewIsModal).toBe(true)
    expect(panel()?.props.accessibilityLabel).toBe('Rename the file')
  })

  test('is named by its title where it has no label, and by its fallback where it has neither', async () => {
    await draw(
      <HelixDialog header={<Text>Delete project</Text>} open>
        <Text>Words</Text>
      </HelixDialog>,
    )
    expect(panel()?.props.accessibilityLabel).toBe('Delete project')
    await draw(
      <HelixDialog fallbackLabel="Dialogfenster" open>
        <Text>Words</Text>
      </HelixDialog>,
    )
    expect(panel()?.props.accessibilityLabel).toBe('Dialogfenster')
  })

  test('is an alert dialog under `alert`', async () => {
    await draw(rename({ alert: true }))
    expect(panel('alertdialog')).toBeDefined()
  })

  test('says its name as it opens, since a phone has no dialog role to read it by', async () => {
    await draw(rename())
    expect(announced.said.map((one) => one.message)).toContain('Rename the file')
  })

  test('closes on a press on its scrim, and tells before-close, toggle, and close in that order', async () => {
    const heard: string[] = []
    await draw(
      rename({
        onBeforeClose: () => heard.push('before-close'),
        onClose: () => heard.push('close'),
        onToggle: (event: { detail: { newState: string } }) =>
          heard.push(`toggle ${event.detail.newState}`),
      }),
    )
    await act(async () => {
      fireEvent.press(scrim() as never)
    })
    await frames()
    expect(heard).toEqual(['before-close', 'toggle closed', 'close'])
  })

  test('under `closedby="closerequest"`, keeps a press on its scrim and closes on Escape', async () => {
    const closing = jest.fn()
    await draw(rename({ closedby: 'closerequest', onBeforeClose: closing }))
    await act(async () => {
      fireEvent.press(scrim() as never)
    })
    expect(closing).not.toHaveBeenCalled()
    await act(async () => {
      keys.press(null, 'Escape')
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('`persistent` keeps every dismissal, swells as a press on its scrim is kept, and its close control still closes it', async () => {
    const closing = jest.fn()
    const clock = fakeTimers()
    setTimers(clock)
    await draw(rename({ dismissible: true, onBeforeClose: closing, persistent: true }))
    await act(async () => {
      keys.press(null, 'Escape')
      fireEvent.press(scrim() as never)
    })
    await act(async () => clock.runFrame())
    expect(closing).not.toHaveBeenCalled()
    /* The swell runs for duration-normal, and the panel settles once it has. */
    expect(styleOf(panel() ?? { props: {} }).animationDuration).toBe(light['duration-normal'])
    await act(async () => clock.advance(Number(light['duration-normal'])))
    expect(styleOf(panel() ?? { props: {} }).animationDuration).toBeUndefined()
    const close = viewsWhere((props) => props.accessibilityLabel === 'Close')[0]
    expect(close?.props.accessibilityRole ?? close?.props.role).toBe('button')
    await act(async () => {
      fireEvent.press(close as never)
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('is a sheet below a window of 30rem, square at the bottom, its last row clear of the home indicator', async () => {
    await draw(rename(), NARROW)
    const style = styleOf(panel() ?? { props: {} })
    expect(style.marginTop).toBe('auto')
    expect(style.borderBottomLeftRadius ?? style.borderBottomStartRadius).toBe(0)
    expect(style.width).toBe(Dimensions.get('window').width)
    /* The panel scrolls what it holds, padded by space-lg, and by the home
       indicator's 34 points as well at the bottom, at this rem. */
    const content = viewsWhere((props) => props.contentContainerStyle !== undefined)[0]
    const inside = styleOf({ props: { style: content?.props.contentContainerStyle } })
    expect(inside.padding).toBe(NARROW * 1.5)
    expect(inside.paddingBottom).toBe(NARROW * 1.5 + 34)
  })

  test('is a card as wide as its size says in a wide window', async () => {
    await draw(rename({ size: 'sm' }))
    const style = styleOf(panel() ?? { props: {} })
    expect(style.width).toBe(22 * 16)
    expect(style.marginTop).toBeUndefined()
  })
})
