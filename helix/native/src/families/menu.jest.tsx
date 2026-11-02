/*
 * The generated Menu, drawn from its real intermediate forms in the layer
 * host: a panel its trigger's press opens, focus on its first row, a row
 * that asks with `before-select`, says `select`, and closes the menu once
 * it stands, choices that turn
 * before their event and a menu that sends `change`, a Space on a choice
 * that keeps the menu open, a row whose page shows
 * in place of the one showing under a header with the way back, a sheet
 * below a window of 30rem, and a
 * trigger whose long press opens it. Floating UI's hook stands in for the
 * one that measures views on a device. `test:native` writes the components
 * beside this file.
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
import { Dimensions, Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { HelixMenu, HelixMenuItem, HelixMenuSection } from './menu/index.native'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: () => ({
      middlewareData: {},
      placement: 'bottom-start',
      refs: {
        reference: { current: null },
        setFloating: () => undefined,
        setReference: () => undefined,
      },
      update: () => undefined,
      x: 20,
      y: 20,
    }),
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let focus: FakeFocus<unknown>
let clock: FakeTimers
const real = timers()

const app = (content: ReactNode, rem?: number) => (
  <ThemeProvider {...(rem === undefined ? {} : { rem })} tokens={light}>
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

const draw = async (content: ReactNode, rem?: number) => {
  drawn = await render(app(content, rem))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

const roleOf = (props: Readonly<Record<string, unknown>>) => props.role ?? props.accessibilityRole

/** The trigger passed in, a button that says Options. */
const trigger = () =>
  viewsWhere((props) => roleOf(props) === 'button').find(
    (node) => node.queryAll((inner) => inner.props.children === 'Options').length > 0,
  )

/** The panel, a menu. */
const panel = () =>
  viewsWhere((props) => roleOf(props) === 'menu' && props.onAccessibilityEscape !== undefined)[0]

/** The row whose words are `words`. */
const row = (words: string) =>
  viewsWhere((props) => String(roleOf(props) ?? '').startsWith('menuitem')).find(
    (node) => node.queryAll((inner) => inner.props.children === words).length > 0,
  )

/** Whether words are drawn anywhere. */
const shows = (words: string) => viewsWhere((props) => props.children === words).length > 0

/** A press, and the panel's motion run to its end. */
const press = async (node: unknown) => {
  await act(async () => {
    fireEvent.press(node as never)
  })
  await frames()
  await act(async () => clock.advance(400))
  await act(() => new Promise<void>((done) => setTimeout(done, 300)))
}

/** The way back over a page below the top. */
const back = () =>
  viewsWhere((props) => props.accessibilityLabel === 'Back' && roleOf(props) === 'menuitem')[0]

const AT = { nativeEvent: { pageX: 100, pageY: 100 } }

const button = <HelixButton>Options</HelixButton>

/** A menu of a command, a page of a run of choices, and a choice. */
const menu = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixMenu label="View options" trigger={button} {...props}>
    <HelixMenuItem value="rename">Rename</HelixMenuItem>
    <HelixMenuItem
      submenu={[
        <HelixMenuItem checked exclusive key="name" value="name">
          Name
        </HelixMenuItem>,
        <HelixMenuItem exclusive key="date" value="date">
          Date
        </HelixMenuItem>,
      ]}
      value="sort"
    >
      Sort by
    </HelixMenuItem>
    <HelixMenuItem checkable value="hidden">
      Show hidden files
    </HelixMenuItem>
  </HelixMenu>
)

beforeEach(() => {
  keys = fakeKeys<unknown>()
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

describe('the generated Menu', () => {
  test('a press on the trigger opens a menu named by its label, with focus on its first row', async () => {
    const heard: string[] = []
    await draw(
      menu({
        onBeforeOpen: () => heard.push('before-open'),
        onToggle: (event: { newState: string }) => heard.push(`toggle ${event.newState}`),
      }),
    )
    expect(panel()).toBeUndefined()
    await press(trigger())
    expect(heard).toEqual(['before-open', 'toggle open'])
    expect(panel()?.props.accessibilityLabel).toBe('View options')
    expect(focus.focused()).not.toBeNull()
    expect(row('Rename')).toBeDefined()
  })

  test('choosing a row asks and says select on the row and the menu, then closes it, and a refused one keeps it', async () => {
    const heard: string[] = []
    await draw(
      menu({
        onBeforeClose: () => heard.push('before-close'),
        onBeforeSelect: (event: Told) =>
          heard.push(`menu before-select ${String(event.detail.value)}`),
        onSelect: (event: Told) => heard.push(`menu select ${String(event.detail.value)}`),
      }),
    )
    await press(trigger())
    await press(row('Rename'))
    expect(heard).toEqual(['menu before-select rename', 'menu select rename', 'before-close'])
    expect(panel()).toBeUndefined()
    await draw(menu({ onBeforeSelect: (event: Told) => event.preventDefault() }))
    await press(trigger())
    await press(row('Rename'))
    expect(panel()).toBeDefined()
  })

  test('a choice turns before its before-select, says whether it is checked, and the menu sends change after it', async () => {
    const heard: string[] = []
    await draw(
      menu({
        closeOnSelect: false,
        onBeforeSelect: (event: Told) => heard.push(`before-select ${String(event.detail.value)}`),
        onChange: () => heard.push('change'),
        onSelect: (event: Told) => heard.push(`select ${String(event.detail.value)}`),
      }),
    )
    await press(trigger())
    const choice = row('Show hidden files')
    expect(choice?.props.accessibilityState?.checked).toBe(false)
    await press(choice)
    expect(heard).toEqual(['before-select hidden', 'change', 'select hidden'])
    expect(row('Show hidden files')?.props.accessibilityState?.checked).toBe(true)
    expect(panel()).toBeDefined()
  })

  test('Space on a choice turns it and keeps the menu open, and Enter or Space on a command closes it', async () => {
    const key = async (pressed: string) => {
      await act(() => {
        keys.press(focus.focused(), pressed)
      })
      await frames()
    }
    await draw(menu())
    await press(trigger())
    await key('ArrowDown')
    await key('ArrowDown')
    await key(' ')
    expect(row('Show hidden files')?.props.accessibilityState?.checked).toBe(true)
    expect(panel()).toBeDefined()
    await key('Enter')
    await act(() => new Promise<void>((done) => setTimeout(done, 300)))
    expect(panel()).toBeUndefined()
    await press(trigger())
    await key(' ')
    await act(() => new Promise<void>((done) => setTimeout(done, 300)))
    expect(panel()).toBeUndefined()
  })

  test('is a sheet along the window’s bottom edge below 30rem, and a popover as presentation says', async () => {
    /* A rem at which the window is narrower than 30rem. */
    const narrow = Math.ceil(Dimensions.get('window').width / 30) + 1
    const panelStyle = () =>
      Object.assign({}, ...[panel()?.props.style].flat(3)) as Record<string, unknown>
    await draw(menu({ open: true }), narrow)
    expect(panelStyle().borderBottomStartRadius).toBe(0)
    expect(viewsWhere((props) => props.importantForAccessibility === 'no')).not.toHaveLength(0)
    await draw(menu({ open: true, presentation: 'popover' }), narrow)
    expect(panelStyle().borderBottomStartRadius).toBeUndefined()
  })

  test('a row with a page shows it under the way back and the page’s name, and the way back returns', async () => {
    const heard: string[] = []
    await draw(menu({ onSelect: (event: Told) => heard.push(String(event.detail.value)) }))
    await press(trigger())
    await press(row('Sort by'))
    expect(heard).toEqual([])
    expect(row('Rename')).toBeUndefined()
    expect(row('Name')).toBeDefined()
    expect(row('Name')?.props.accessibilityState?.checked).toBe(true)
    expect(row('Date')?.props.accessibilityState?.checked).toBe(false)
    expect(panel()?.props.accessibilityLabel).toBe('Sort by')
    expect(back()).toBeDefined()
    await press(row('Date'))
    expect(heard).toEqual(['date'])
    await draw(menu())
    await press(trigger())
    await press(row('Sort by'))
    await press(back())
    expect(row('Rename')).toBeDefined()
  })

  test('says its loading words while it loads, and its empty words with no rows', async () => {
    await draw(
      <HelixMenu defaultOpen loading trigger={button}>
        <HelixMenuItem value="one">One</HelixMenuItem>
      </HelixMenu>,
    )
    expect(shows('Loading')).toBe(true)
    await draw(<HelixMenu defaultOpen trigger={button} />)
    expect(shows('Nothing to show')).toBe(true)
  })

  test('under open-on="long-press", a quick press is the trigger’s own and a held one opens it', async () => {
    await draw(menu({ openOn: 'long-press' }))
    expect(trigger()?.props.accessibilityHint).toBe('Long press or press Alt+Down to show the menu')
    await press(trigger())
    expect(panel()).toBeUndefined()
    await act(async () => {
      fireEvent(trigger() as never, 'pressIn', AT)
    })
    await act(async () => clock.advance(500))
    await act(async () => {
      fireEvent(trigger() as never, 'pressOut', AT)
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(panel()).toBeDefined()
  })

  test('names a section by its label, and draws a row’s shortcut in the keyboard’s glyphs', async () => {
    await draw(
      <HelixMenu defaultOpen label="Edit" trigger={button}>
        <HelixMenuSection label="Clipboard">
          <HelixMenuItem shortcut="mod+c" value="copy">
            Copy
          </HelixMenuItem>
        </HelixMenuSection>
      </HelixMenu>,
    )
    expect(viewsWhere((props) => props.accessibilityLabel === 'Clipboard')[0]).toBeDefined()
    expect(shows('⌘C') || shows('Ctrl+C')).toBe(true)
  })

  test('Escape on a page goes back to the one above, and on the top page closes the menu', async () => {
    await draw(menu())
    await press(trigger())
    await press(row('Sort by'))
    await act(() => {
      keys.press(focus.focused(), 'Escape')
    })
    await frames()
    expect(row('Rename')).toBeDefined()
    await act(() => {
      keys.press(focus.focused(), 'Escape')
    })
    await act(() => new Promise<void>((done) => setTimeout(done, 300)))
    expect(panel()).toBeUndefined()
  })

  test('under context, a press is the area’s own and a long press opens the menu', async () => {
    await draw(menu({ context: true }))
    expect(trigger()?.props.accessibilityHint).toBeUndefined()
    await press(trigger())
    expect(panel()).toBeUndefined()
    await act(async () => {
      fireEvent(trigger() as never, 'pressIn', AT)
    })
    await act(async () => clock.advance(500))
    await act(async () => {
      fireEvent(trigger() as never, 'pressOut', AT)
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(panel()).toBeDefined()
  })
})
