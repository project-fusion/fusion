/*
 * The generated Tag on its own, drawn from its real intermediate form: one
 * press a screen reader reaches as one element, its remove button offered as
 * an action named for the tag, the fill, the edge and the label of each
 * tone and emphasis, a link that opens through the app's open-link, and a
 * height and a mark that stop at the largest standard text size while the
 * words grow. `test:native` writes the component beside this file, as the
 * styled package's build writes the one it ships.
 */
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import {
  act,
  fireEvent,
  isHiddenFromAccessibility,
  render,
  screen,
} from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text, View } from 'react-native'
import { mix } from '../style/color'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { styleOf } from './drawn'
import { HelixTag, type HelixTagProps } from './tag/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ name, size }: GlyphProps) => (
  <View style={{ height: size, width: size }} testID={`glyph ${name}`} />
)

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

beforeEach(() => {
  atTextSize(1)
})

/** The theme's tokens, handed out of the tree. */
let tokens: Readonly<Record<string, number | string>> = {}
const Tokens = () => {
  tokens = useTokens()
  return null
}

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
    <Tokens />
  </HelixTheme>
)

/** A tag with these props, alone in the theme. */
const tag = (props: HelixTagProps) => themed(<HelixTag {...props} />)

/** A rendered view, as Testing Library finds it. */
type Found = ReturnType<typeof screen.getByText>

/** The view a touch on these words lands on: the tag's one press. */
const pressOf = (words: string): Found => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's instances are untyped
  let at: any = screen.getByText(words, { includeHiddenElements: true })
  while (at !== null && typeof at.props.onResponderGrant !== 'function') {
    at = at.parent
  }
  return at
}

/** The view the tag's look is drawn on: the nearest view around its press with a fill. */
const hostOf = (words: string): Found => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's instances are untyped
  let at: any = pressOf(words).parent
  while (at !== null && styleOf(at).backgroundColor === undefined) {
    at = at.parent
  }
  return at
}

/** The remove button: the press around the glyph it draws. */
const buttonOf = (): Found => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's instances are untyped
  let at: any = screen.getByTestId('glyph x', { includeHiddenElements: true })
  while (at !== null && typeof at.props.onResponderGrant !== 'function') {
    at = at.parent
  }
  return at
}

/** A token's color. */
const color = (name: string): string => String(tokens[name])

describe('a tag on its own', () => {
  test('is one element a screen reader reaches, read by its words, with no role', async () => {
    await render(tag({ children: 'Design' }))
    const press = pressOf('Design')
    expect(press.props.accessibilityRole).toBeUndefined()
    expect(press.props.accessibilityActions).toBeUndefined()
    expect(screen.getByText('Design')).toBeTruthy()
  })

  test('fills with a tint of its tone and draws no edge, mixed in sRGB', async () => {
    await render(tag({ children: 'Done', tone: 'success' }))
    const look = styleOf(hostOf('Done'))
    const success = color('color-success')
    expect(look.backgroundColor).toBe(mix(success, 14, color('color-background'), 'srgb'))
    expect(look.borderTopColor ?? look.borderColor).toBe('transparent')
    expect(styleOf(screen.getByText('Done')).color).toBe(
      mix(success, 55, color('color-foreground')),
    )
  })

  test('fills with its tone under `solid`, with the inverse ink, and draws its edge alone under `outlined`', async () => {
    const view = await render(tag({ children: 'Late', emphasis: 'solid', tone: 'danger' }))
    expect(styleOf(hostOf('Late')).backgroundColor).toBe(
      mix(color('color-danger'), 82, color('color-foreground')),
    )
    expect(styleOf(screen.getByText('Late')).color).toBe(color('color-foreground-inverse'))
    await view.rerender(tag({ children: 'Late', emphasis: 'outlined', tone: 'danger' }))
    expect(styleOf(hostOf('Late')).backgroundColor).toBe('transparent')
  })

  test('rounds its ends under `shape="pill"`, and keeps its words on one line', async () => {
    await render(tag({ children: 'Beta', shape: 'pill' }))
    expect(styleOf(hostOf('Beta')).borderRadius).toBe(tokens['radii-full'])
    expect(screen.getByText('Beta').props.numberOfLines).toBe(1)
  })
})

describe('a removable tag', () => {
  test('offers its remove button as an action named for the tag, and hides the button', async () => {
    await render(tag({ children: 'Apple', dismissible: true }))
    expect(pressOf('Apple').props.accessibilityActions).toEqual([
      { label: 'Remove Apple', name: 'dismiss' },
    ])
    expect(
      isHiddenFromAccessibility(screen.getByTestId('glyph x', { includeHiddenElements: true })),
    ).toBe(true)
  })

  test('names the button with its category first, and where `dismissLabel` puts the words', async () => {
    const view = await render(
      tag({ children: 'High', dismissible: true, start: <Text>Priority</Text> }),
    )
    expect(pressOf('High').props.accessibilityActions).toEqual([
      { label: 'Remove Priority High', name: 'dismiss' },
    ])
    await view.rerender(
      tag({ children: 'Open', dismissible: true, dismissLabel: '{label} entfernen' }),
    )
    expect(pressOf('Open').props.accessibilityActions).toEqual([
      { label: 'Open entfernen', name: 'dismiss' },
    ])
  })

  test('sends `dismiss` with its words from the action and from a tap on the button, and stays', async () => {
    const told: string[] = []
    await render(
      tag({
        children: 'Apple',
        dismissible: true,
        onDismiss: (event) => told.push(`dismiss ${event.detail.label}`),
      }),
    )
    await fireEvent(pressOf('Apple'), 'accessibilityAction', {
      nativeEvent: { actionName: 'dismiss' },
    })
    await fireEvent.press(buttonOf())
    expect(told).toEqual(['dismiss Apple', 'dismiss Apple'])
    expect(screen.getByText('Apple')).toBeTruthy()
  })

  test('is out of reach while disabled: no action, and drawn at half strength', async () => {
    await render(tag({ children: 'Archived', disabled: true, dismissible: true }))
    const press = pressOf('Archived')
    expect(press.props.accessibilityActions).toBeUndefined()
    expect(press.props.accessibilityState).toMatchObject({ disabled: true })
    expect(styleOf(hostOf('Archived')).opacity).toBe(0.5)
  })
})

describe('a link tag', () => {
  test('is a link that opens through the app’s open-link', async () => {
    const opened = fakeOpenLink()
    setOpenLink(opened)
    await render(tag({ children: 'Labels', href: 'https://example.com/labels' }))
    expect(screen.getByRole('link', { name: 'Labels' })).toBeTruthy()
    await fireEvent.press(screen.getByRole('link', { name: 'Labels' }))
    expect(opened.opened).toEqual(['https://example.com/labels'])
  })
})

describe('large text', () => {
  /* Above 1.353 the height is the least the tag can be, so it grows taller
     round words that do not fit, as a control does. */
  test('the words grow fully, and the height, the corners and the mark stop at 1.353 times', async () => {
    await render(tag({ children: 'Design', dismissible: true }))
    const height = Number(tokens['size-tag'])
    const words = Number(tokens['text-xs'])
    const radius = Number(tokens['radii-sm'])
    await act(() => atTextSize(3.571))
    const look = styleOf(hostOf('Design'))
    expect(look.minHeight ?? look.height).toBeCloseTo(height * 1.353, 1)
    expect(look.borderRadius).toBeCloseTo(radius * 1.353, 1)
    expect(styleOf(screen.getByText('Design')).fontSize).toBeCloseTo(words * 3.571, 1)
    const mark = styleOf(screen.getByTestId('glyph x', { includeHiddenElements: true }))
    expect(mark.height).toBeCloseTo(words * 1.353, 1)
  })
})
