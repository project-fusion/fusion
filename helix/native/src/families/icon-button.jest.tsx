/*
 * The generated Icon Button, drawn from its real intermediate form: Button's
 * press on a square that holds an icon, named by its `label`, resting as a
 * ghost in the muted ink. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixIcon } from './icon/index.native'
import { HelixIconButton, type HelixIconButtonPressEvent } from './icon-button/index.native'

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
/* The parts listening for keys, in the order they started. */
let listening: unknown[] = []

/** Presses `key` on the first part listening for keys, as a hardware keyboard does. */
const pressKey = (key: string) => act(() => void keys.press(listening[0], key))

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      listening.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

/** A token's value, as `Token` shows it. */
const tokenOf = (name: string): string =>
  String(screen.getByTestId(new RegExp(`^token ${name} `)).props.testID)
    .split(' ')
    .slice(2)
    .join(' ')

/** The style of the glyph `name`, which a screen reader does not reach. */
const glyphOf = (name: string) =>
  styleOf(screen.getByTestId(`glyph ${name}`, { includeHiddenElements: true }))

/** A button holding the `x` icon, named `Close`. */
const close = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixIconButton label="Close" {...props}>
    <HelixIcon name="x" />
  </HelixIconButton>
)

describe('an icon button', () => {
  test('is a button named by its label, and draws its icon through Icon', async () => {
    await render(themed(close()))
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(glyphOf('x')).toBeTruthy()
  })

  test('sends `press` with how it was pressed, on a tap, Enter, and Space', async () => {
    const heard: string[] = []
    const onPress = (event: HelixIconButtonPressEvent) => heard.push(event.detail.pointerType)
    await render(themed(close({ onPress })))
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }))
    await pressKey('Enter')
    await pressKey(' ')
    expect(heard).toHaveLength(3)
  })

  test('says it is disabled, takes no press, and is drawn at half its opacity', async () => {
    const onPress = jest.fn()
    await render(themed(close({ disabled: true, onPress })))
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button.props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(button)
    await pressKey('Enter')
    expect(onPress).not.toHaveBeenCalled()
    expect(styleOf(button).opacity).toBe(0.5)
  })

  test('keeps its focus while disabled under `focusableWhenDisabled`, and takes no press', async () => {
    const onPress = jest.fn()
    await render(themed(close({ disabled: true, focusableWhenDisabled: true, onPress })))
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button.props.accessibilityState).toMatchObject({ disabled: true })
    expect(button.props.focusable).toBe(true)
    await fireEvent.press(button)
    await pressKey('Enter')
    expect(onPress).not.toHaveBeenCalled()
  })

  test('says it is busy while pending, hides its icon under a ring, and refuses a press', async () => {
    const onPress = jest.fn()
    await render(themed(close({ onPress, pending: true })))
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button.props.accessibilityState).toMatchObject({ busy: true })
    let opacity = 1
    let at: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId('glyph x', {
      includeHiddenElements: true,
    })
    while (at !== null && at !== button) {
      opacity *= (styleOf(at)?.opacity as number | undefined) ?? 1
      at = at.parent
    }
    expect(opacity).toBe(0)
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
  })
})

describe('what a phone draws of an icon button', () => {
  test('a square the control’s height, with no ground, its icon in the muted ink', async () => {
    await render(
      themed(
        <>
          {close()}
          <Token name="size-control" />
          <Token name="color-foreground-muted" />
          <Token name="size-icon" />
        </>,
      ),
    )
    const button = styleOf(screen.getByRole('button', { name: 'Close' }))
    expect(String(button.height)).toBe(tokenOf('size-control'))
    expect(String(button.width)).toBe(tokenOf('size-control'))
    expect(button.backgroundColor).toBe('transparent')
    expect(glyphOf('x').backgroundColor).toBe(tokenOf('color-foreground-muted'))
    expect(String(glyphOf('x').height)).toBe(tokenOf('size-icon'))
  })

  test('a solid primary button is filled with the primary surface', async () => {
    await render(
      themed(
        <>
          {close({ emphasis: 'solid', tone: 'primary' })}
          <Token name="color-primary-surface" />
          <Token name="color-foreground-on-primary" />
        </>,
      ),
    )
    const button = styleOf(screen.getByRole('button', { name: 'Close' }))
    expect(button.backgroundColor).toBe(tokenOf('color-primary-surface'))
    expect(glyphOf('x').backgroundColor).toBe(tokenOf('color-foreground-on-primary'))
  })

  test('an outlined danger button draws its edge and its icon in the tone', async () => {
    await render(
      themed(
        <>
          {close({ emphasis: 'outlined', tone: 'danger' })}
          <Token name="color-danger" />
        </>,
      ),
    )
    const button = styleOf(screen.getByRole('button', { name: 'Close' }))
    expect(button.borderColor).toBe(tokenOf('color-danger'))
    expect(button.borderWidth).toBeGreaterThan(0)
    expect(glyphOf('x').backgroundColor).toBe(tokenOf('color-danger'))
  })

  test('a circle is round, and a raised button floats on the overlay with a shadow', async () => {
    await render(
      themed(
        <>
          {close({ shape: 'circle' })}
          <HelixIconButton label="Locate" raised>
            <HelixIcon name="crosshair" />
          </HelixIconButton>
          <Token name="color-surface-overlay" />
        </>,
      ),
    )
    const circle = styleOf(screen.getByRole('button', { name: 'Close' }))
    expect(circle.borderRadius).toBeGreaterThanOrEqual((circle.height as number) / 2)
    const raised = styleOf(screen.getByRole('button', { name: 'Locate' }))
    expect(raised.backgroundColor).toBe(tokenOf('color-surface-overlay'))
    expect(raised.boxShadow).toBeTruthy()
  })

  test('stops its size and its icon growing at 1.353 times the default text size', async () => {
    await render(themed(close()))
    const height = styleOf(screen.getByRole('button', { name: 'Close' })).height as number
    const icon = glyphOf('x').height as number
    await act(() => atTextSize(3.571))
    const grown = styleOf(screen.getByRole('button', { name: 'Close' }))
    /* Above the largest standard size, a control's height is the least it
       can be, so words in it could grow it. */
    expect(grown.minHeight).toBeCloseTo(height * 1.353, 1)
    expect(grown.width).toBeCloseTo(height * 1.353, 1)
    expect(glyphOf('x').height).toBeCloseTo(icon * 1.353, 1)
  })
})
