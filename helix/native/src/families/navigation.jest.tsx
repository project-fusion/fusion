/*
 * The generated Navigation, drawn from its real intermediate forms: a
 * landmark named by its label, each item a link that opens through the
 * app's open-link and says in words that it is current, the arrow keys
 * along the way the destinations run under `arrows`, and the open state a
 * popover among the destinations gives it. `test:native` writes the
 * components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { clearWords, registerWords } from '@fusion.dev/helix-core/words'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import {
  HelixNavigation,
  HelixNavigationItem,
  type HelixNavigationItemProps,
  type HelixNavigationProps,
} from './navigation/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
let opened: FakeOpenLink = fakeOpenLink()
/* The views listening for keys, each once, in the order they first started. */
let heard: unknown[] = []

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  focus = fakeFocus<unknown>()
  setFocus(focus)
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!heard.includes(node)) {
        heard.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
  opened = fakeOpenLink()
  setOpenLink(opened)
})

afterEach(() => {
  clearWords()
})

/** Presses `key` on the view that started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** A drawn view and its parents, as the testing library gives them. */
interface Drawn {
  readonly parent: Drawn | null
  readonly props: Readonly<Record<string, unknown>>
}

/** The view a screen reader reaches as one element around `drawn`. */
const elementAround = (drawn: Drawn): Drawn | null =>
  drawn.props.accessible === true
    ? drawn
    : drawn.parent === null
      ? null
      : elementAround(drawn.parent)

/** The element around the words `text`. */
const reached = (text: string): Drawn | null => elementAround(screen.getByText(text) as Drawn)

/** Each landmark drawn, by the name a screen reader hears. */
const landmarks = () =>
  screen.container
    .queryAll((node) => node.props.role === 'navigation')
    .map((node) => node.props.accessibilityLabel)

/** Overview, the current page, then Activity and Settings. */
const Sections = (
  props: Partial<HelixNavigationProps> & {
    readonly activity?: Partial<HelixNavigationItemProps>
    readonly current?: string
  },
) => {
  const { activity, current = 'one', ...rest } = props
  const at = (which: string) => (which === current ? ({ current: 'page' } as const) : {})
  return (
    <HelixTheme Glyph={Recorded} mode="light">
      <HelixNavigation {...rest}>
        <HelixNavigationItem href="/one" {...at('one')}>
          Overview
        </HelixNavigationItem>
        <HelixNavigationItem href="/two" {...at('two')} {...activity}>
          Activity
        </HelixNavigationItem>
        <HelixNavigationItem href="/three" {...at('three')}>
          Settings
        </HelixNavigationItem>
      </HelixNavigation>
    </HelixTheme>
  )
}

describe('the generated Navigation', () => {
  test('is a navigation named by its label, `Main` until it is given one', async () => {
    const view = await render(<Sections />)
    expect(landmarks()).toEqual(['Main'])
    await view.rerender(<Sections label="Sections" />)
    expect(landmarks()).toEqual(['Sections'])
  })

  test('draws each item with an `href` as a link named by its words', async () => {
    await render(<Sections />)
    for (const name of ['Overview', 'Activity', 'Settings']) {
      expect(screen.getByRole('link', { name })).toBeTruthy()
    }
  })

  test('says the current page in words after its own, and keeps it a link', async () => {
    await render(<Sections />)
    expect(screen.getByRole('link', { name: 'Overview' })).toBeTruthy()
    expect(reached('Overview')?.props.accessibilityValue).toEqual({ text: 'Current page' })
    expect(
      (reached('Activity')?.props.accessibilityValue as { text?: string } | undefined)?.text,
    ).toBeUndefined()
  })

  test('says a section in view as the current location, in the words an app registers', async () => {
    registerWords('en', { 'helix-current': { location: 'In view' } })
    await render(<Sections activity={{ current: 'location' }} current="none" />)
    expect(reached('Activity')?.props.accessibilityValue).toEqual({ text: 'In view' })
  })

  test('moves the current page as the page writes it', async () => {
    const view = await render(<Sections />)
    await view.rerender(<Sections current="three" />)
    expect(reached('Settings')?.props.accessibilityValue).toEqual({ text: 'Current page' })
    expect(
      (reached('Overview')?.props.accessibilityValue as { text?: string } | undefined)?.text,
    ).toBeUndefined()
  })

  test('draws an item with no `href` as its words, which no press holds', async () => {
    await render(<Sections activity={{ href: '' }} />)
    expect(screen.queryByRole('link', { name: 'Activity' })).toBeNull()
  })

  test('asks with `before-select` and the `href` as its value, says `select`, then opens the link, and chooses nothing', async () => {
    const told: unknown[] = []
    await render(
      <Sections
        activity={{
          onBeforeSelect: (event) =>
            told.push(`before ${(event.detail as { value: unknown }).value}`),
          onSelect: (event) => told.push(`select ${(event.detail as { value: unknown }).value}`),
        }}
      />,
    )
    await fireEvent.press(screen.getByRole('link', { name: 'Activity' }))
    expect(told).toEqual(['before /two', 'select /two'])
    expect(opened.opened).toEqual(['/two'])
    expect(reached('Overview')?.props.accessibilityValue).toEqual({ text: 'Current page' })
  })

  test('opens nothing where a handler refused `before-select`', async () => {
    await render(<Sections activity={{ onBeforeSelect: (event) => event.preventDefault() }} />)
    await fireEvent.press(screen.getByRole('link', { name: 'Activity' }))
    expect(opened.opened).toEqual([])
  })

  test('moves focus along the row with the arrows under `arrows`, stopping at the ends', async () => {
    await render(<Sections arrows />)
    await pressKey(0, 'ArrowRight')
    expect(heard.indexOf(focus.focused())).toBe(1)
    await pressKey(1, 'End')
    expect(heard.indexOf(focus.focused())).toBe(2)
    await pressKey(2, 'ArrowRight')
    expect(heard.indexOf(focus.focused())).toBe(2)
    await pressKey(2, 'Home')
    expect(heard.indexOf(focus.focused())).toBe(0)
    await pressKey(0, 'ArrowLeft')
    expect(heard.indexOf(focus.focused())).toBe(0)
    expect(opened.opened).toEqual([])
  })

  test('leaves Down and Up to the page in a row under `arrows`', async () => {
    await render(<Sections arrows />)
    await pressKey(0, 'ArrowDown')
    await pressKey(0, 'ArrowUp')
    expect(focus.moved.length).toBe(0)
  })

  test('leaves the arrows alone without `arrows`', async () => {
    await render(<Sections />)
    await pressKey(0, 'ArrowRight')
    await pressKey(0, 'End')
    expect(focus.moved.length).toBe(0)
  })

  test('moves focus with Down and Up in a column, and leaves Left and Right to the page', async () => {
    await render(<Sections arrows orientation="vertical" />)
    await pressKey(0, 'ArrowDown')
    expect(heard.indexOf(focus.focused())).toBe(1)
    await pressKey(1, 'ArrowUp')
    expect(heard.indexOf(focus.focused())).toBe(0)
    const moves = focus.moved.length
    await pressKey(0, 'ArrowRight')
    await pressKey(0, 'ArrowLeft')
    expect(focus.moved.length).toBe(moves)
  })

  test('draws the current item’s words at full strength and heavier than the rest', async () => {
    await render(<Sections />)
    const current = styleOf(screen.getByText('Overview'))
    const other = styleOf(screen.getByText('Activity'))
    expect(current.color).not.toBe(other.color)
    expect(Number(current.fontWeight)).toBeGreaterThan(Number(other.fontWeight))
  })

  test('draws a section above the current page with its words at full strength', async () => {
    await render(<Sections activity={{ current: 'true' }} current="none" />)
    const above = styleOf(screen.getByText('Activity'))
    expect(above.color).not.toBe(styleOf(screen.getByText('Settings')).color)
    await render(<Sections />)
    expect(above.color).toBe(styleOf(screen.getByText('Overview')).color)
  })
})
