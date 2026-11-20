/*
 * The layer host and a layer's machine: a dialog drawn over the app in the
 * host, with the contexts it carries, the reader held while it is modal, a
 * dismissal that its toggle may refuse, the keyboard's room, and focus moved
 * in and back. The forms are written here in the shape the compiler writes,
 * since no neutral family opens a layer yet.
 */

import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createContext, type ReactNode, use } from 'react'
import { BackHandler, Keyboard, Text } from 'react-native'
import { behaviorFor } from '../machines/compose'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider, useTheme } from '../theme/theme'
import { carryIntoLayers } from './carry'
import { element } from './element'

/** A dialog: a modal layer that opens on `open`, which its toggle holds, with a press inside. */
const dialogForm = (attributes: Readonly<Record<string, unknown>> = {}): Family => ({
  api: {
    events: [
      { cancelable: true, detail: ['open'], name: 'before-close' },
      { cancelable: true, detail: ['open'], name: 'before-open' },
    ],
    props: [{ attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' }],
    states: ['open'],
    toggle: { checked: 'open', closes: 'before-close', opens: 'before-open' },
  },
  machines: [
    {
      bind: {
        checked: { prop: 'open' },
        closes: { event: 'before-close' },
        opens: { event: 'before-open' },
      },
      machine: 'toggle',
    },
    { bind: { open: { prop: 'open' }, part: { part: 'surface' } }, machine: 'layer' },
    { bind: { part: { part: 'confirm' } }, machine: 'press' },
  ],
  name: 'dialog',
  rules: [],
  tag: 'helix-dialog',
  tree: [
    {
      attributes: { modal: true, open: { bind: 'open' }, role: 'dialog', ...attributes },
      children: [
        { children: [{ kind: 'region', name: 'default' }], kind: 'pressable', name: 'confirm' },
      ],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
})

const Dialog = element(dialogForm(), behaviorFor(dialogForm()))
const dismissibleForm = dialogForm({ closedby: 'any' })
const Dismissible = element(dismissibleForm, behaviorFor(dismissibleForm))
const lightForm = dialogForm({ closedby: 'any', modal: false })
const Light = element(lightForm, behaviorFor(lightForm))

/** The app: its own words, and what the spec draws in it, under the layer host. */
const app = (content: ReactNode) => (
  <ThemeProvider tokens={{}}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** What the spec drew last, whose container holds the app and the host's layers. */
let drawn: Awaited<ReturnType<typeof render>> | undefined

/** Draws `content` in the app. */
const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
}

/** Draws `content` in the app again. */
const redraw = async (content: ReactNode) => {
  await screen.rerender(app(content))
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The scrim a modal layer draws under itself. */
const scrim = () =>
  viewsWhere((props) => props.importantForAccessibility === 'no' && props.accessible === false)[0]

/** The layer's own view. */
const layerView = () => viewsWhere((props) => props.role === 'dialog')[0]

/** A frame or two, which the host and the focus scope wait for. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

let keys: FakeKeys<unknown>
let focus: FakeFocus<unknown>

beforeEach(() => {
  keys = fakeKeys()
  focus = fakeFocus()
  setKeys(keys)
  setFocus(focus)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const Carried = createContext('outside')

const Probe = () => (
  <Text>
    {useTheme().tokens['color-foreground']} {use(Carried)}
  </Text>
)

describe('the layer host', () => {
  test('a closed layer draws nothing, and an open one is drawn over the app, holding the reader', async () => {
    await draw(<Dialog>Delete</Dialog>)
    expect(screen.queryByText('Delete')).toBeNull()
    await redraw(<Dialog open>Delete</Dialog>)
    await frames()
    expect(screen.getByText('Delete')).toBeTruthy()
    /* The app is hidden from a screen reader while the modal layer stands. */
    expect(screen.queryByText('Page')).toBeNull()
    expect(screen.getByText('Page', { includeHiddenElements: true })).toBeTruthy()
    expect(layerView()?.props.accessibilityViewIsModal).toBe(true)
    /* What it holds is reached on its own, and the layer is no one element. */
    expect(layerView()?.props.accessible).toBe(false)
  })

  test('what a layer holds reads the theme and the contexts it carries from its element', async () => {
    carryIntoLayers(Carried)
    await draw(
      <ThemeProvider tokens={{ 'color-foreground': '#123456' }}>
        <Carried.Provider value="inside">
          <Dialog open>
            <Probe />
          </Dialog>
        </Carried.Provider>
      </ThemeProvider>,
    )
    await frames()
    expect(screen.getByText('#123456 inside')).toBeTruthy()
  })

  test('the host ends above the software keyboard while it shows', async () => {
    const listened = new Map<string, (event: unknown) => void>()
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, heard: never) => {
      listened.set(name, heard)
      return { remove: () => undefined }
    }) as never)
    await draw(<Dialog open>Delete</Dialog>)
    await frames()
    await act(async () => {
      for (const shows of ['keyboardWillShow', 'keyboardDidShow']) {
        listened.get(shows)?.({ endCoordinates: { height: 300 } })
      }
    })
    const over = viewsWhere(
      (props) =>
        Array.isArray(props.style) &&
        props.style.some((one) => (one as { bottom?: number } | null)?.bottom === 300),
    )
    expect(over).toHaveLength(1)
  })
})

describe('dismissing a layer', () => {
  test('a press on a modal scrim asks the toggle to close, and a refusal keeps it open', async () => {
    let refuse = true
    const asked = jest.fn((event: { preventDefault: () => void }) => {
      if (refuse) {
        event.preventDefault()
      }
    })
    await draw(
      <Dismissible onBeforeClose={asked} open>
        Delete
      </Dismissible>,
    )
    await frames()
    await fireEvent.press(scrim() as never)
    expect(asked).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Delete')).toBeTruthy()
    refuse = false
    await fireEvent.press(scrim() as never)
    await frames()
    expect(asked).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Delete')).toBeNull()
  })

  test('a modal layer takes a close request alone by default: Escape, back, and a reader’s escape', async () => {
    const heard: ((event: never) => boolean | null | undefined)[] = []
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      heard.push(handler as never)
      return { remove: () => undefined }
    })
    /* Each request is refused, so the layer stands for the next. */
    const closes = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    await draw(
      <Dialog onBeforeClose={closes} open>
        Delete
      </Dialog>,
    )
    await frames()
    /* A press on the scrim is no close request. */
    await fireEvent.press(scrim() as never)
    expect(closes).not.toHaveBeenCalled()
    /* Escape, heard anywhere. */
    expect(keys.press(null, 'Escape')).toBe(true)
    expect(closes).toHaveBeenCalledTimes(1)
    /* Escape with a modifier is not a close request. */
    expect(keys.press(null, 'Escape', { shift: true })).toBe(false)
    /* A phone's back, the last handler a layer added. */
    await act(async () => {
      expect(heard.at(-1)?.({} as never)).toBe(true)
    })
    expect(closes).toHaveBeenCalledTimes(2)
    /* VoiceOver's escape, on the layer's view. */
    const readerEscape = layerView()?.props.onAccessibilityEscape as (() => void) | undefined
    await act(async () => readerEscape?.())
    expect(closes).toHaveBeenCalledTimes(3)
    expect(screen.getByText('Delete')).toBeTruthy()
  })

  test('a layer that is not modal holds no one, and closes on a touch on the app outside it', async () => {
    const closes = jest.fn()
    await draw(
      <Light onBeforeClose={closes} open>
        Menu
      </Light>,
    )
    await frames()
    expect(viewsWhere((props) => props.accessibilityElementsHidden === true)).toHaveLength(0)
    expect(scrim()).toBeUndefined()
    const [page] = viewsWhere((props) => typeof props.onTouchStartCapture === 'function')
    await fireEvent(page as never, 'touchStartCapture', { nativeEvent: { pageX: 10, pageY: 10 } })
    expect(closes).toHaveBeenCalledTimes(1)
  })
})

describe('a layer’s focus', () => {
  test('opening moves focus to the first control inside, and closing puts it back', async () => {
    const before = { isConnected: true }
    focus.place(before)
    await draw(<Dialog>Delete</Dialog>)
    await redraw(<Dialog open>Delete</Dialog>)
    await frames()
    const inside = focus.moved.at(-1)?.node
    expect(inside).toBeDefined()
    expect(inside).not.toBe(before)
    /* Tab goes round the one control a modal layer holds. */
    expect(keys.press(null, 'Tab')).toBe(true)
    expect(focus.moved.at(-1)?.node).toBe(inside)
    await redraw(<Dialog open={false}>Delete</Dialog>)
    await frames()
    expect(focus.moved.at(-1)?.node).toBe(before)
  })
})
