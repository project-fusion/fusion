/*
 * The generated Button, drawn from its real intermediate form: a button with
 * its words, the icons at either end sized to the words, and a pending ring
 * over words it keeps in place. `test:native` writes the component beside
 * this file, as the styled package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { HelixIcon } from './icon/index.native'

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

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The height a glyph was asked for. */
const glyphHeight = (name: string): number =>
  styleOf(screen.getByTestId(`glyph ${name}`, { includeHiddenElements: true })).height as number

/** The words' font size, as drawn. */
const wordsSize = (words: string): number => styleOf(screen.getByText(words)).fontSize as number

/** The opacity the words are drawn at: their own, and that of each view up to the button. */
const opacityAround = (words: string): number => {
  let opacity = 1
  let at: ReturnType<typeof screen.getByText> | null = screen.getByText(words, {
    includeHiddenElements: true,
  })
  while (at !== null && at.props.accessibilityRole !== 'button') {
    const own = styleOf(at).opacity
    if (typeof own === 'number') {
      opacity *= own
    }
    at = at.parent
  }
  return opacity
}

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

describe('the generated Button', () => {
  test('is a button named by its words', async () => {
    await render(themed(<HelixButton>Save changes</HelixButton>))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
  })

  test('is named by `label` where it has no words, as an icon button is', async () => {
    await render(
      themed(
        <HelixButton label="Settings">
          <HelixIcon name="gear" />
        </HelixButton>,
      ),
    )
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })

  test('says it is disabled, and a press does nothing', async () => {
    const onPress = jest.fn()
    await render(
      themed(
        <HelixButton disabled onPress={onPress}>
          Save
        </HelixButton>,
      ),
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
    expect(styleOf(button).opacity).toBe(0.5)
  })

  test('keeps its focus while disabled under `focusableWhenDisabled`, says it is disabled, and refuses a press', async () => {
    const onPress = jest.fn()
    await render(
      themed(
        <HelixButton disabled focusableWhenDisabled onPress={onPress}>
          Save
        </HelixButton>,
      ),
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.props.accessibilityState).toMatchObject({ disabled: true })
    expect(button.props.focusable).toBe(true)
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
    expect(styleOf(button).opacity).toBe(0.5)
  })

  test('keeps its keyboard focus on Android while disabled under `focusableWhenDisabled`, where a disabled state would take it, and says its words in its label and that it is disabled in its value', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const onPress = jest.fn()
    await render(
      themed(
        <HelixButton disabled focusableWhenDisabled onPress={onPress}>
          Save
        </HelixButton>,
      ),
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.props.accessibilityState?.disabled).toBeUndefined()
    expect(button.props.accessibilityLabel).toBe('Save')
    expect(button.props.accessibilityValue).toEqual({ text: 'Disabled' })
    expect(button.props.focusable).toBe(true)
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  test('draws a solid primary button in the primary fill', async () => {
    await render(
      themed(
        <>
          <HelixButton emphasis="solid" tone="primary">
            Save
          </HelixButton>
          <Token name="color-primary-surface" />
        </>,
      ),
    )
    const fill = styleOf(screen.getByRole('button', { name: 'Save' })).backgroundColor
    expect(screen.getByTestId(`token color-primary-surface ${fill}`)).toBeTruthy()
  })
})

describe('icons in a button', () => {
  test('are 1.15 times the size of the words, at either end and in the label', async () => {
    await render(
      themed(
        <>
          <HelixButton end={<HelixIcon name="arrow-right" />} start={<HelixIcon name="play" />}>
            Play
          </HelixButton>
          <HelixButton label="Settings">
            <HelixIcon name="gear" />
          </HelixButton>
        </>,
      ),
    )
    const size = wordsSize('Play') * 1.15
    expect(glyphHeight('play')).toBeCloseTo(size, 3)
    expect(glyphHeight('arrow-right')).toBeCloseTo(size, 3)
    expect(glyphHeight('gear')).toBeCloseTo(size, 3)
  })

  test('stop growing at the largest standard text size, 1.353 times, as the words go on', async () => {
    await render(themed(<HelixButton start={<HelixIcon name="play" />}>Play</HelixButton>))
    const words = wordsSize('Play')
    const icon = glyphHeight('play')
    await act(() => atTextSize(3.571))
    expect(wordsSize('Play')).toBeCloseTo(words * 3.571, 1)
    expect(glyphHeight('play')).toBeCloseTo(icon * 1.353, 1)
  })

  test('keep the icon step outside a button', async () => {
    await render(themed(<HelixIcon name="gear" />))
    expect(glyphHeight('gear')).toBe(20)
  })
})

describe('a pending button', () => {
  test('says it is busy, keeps its words in place unseen, and refuses a press', async () => {
    const onPress = jest.fn()
    await render(
      themed(
        <HelixButton onPress={onPress} pending start={<HelixIcon name="play" />}>
          Save
        </HelixButton>,
      ),
    )
    const button = screen.getByRole('button')
    expect(button.props.accessibilityState).toMatchObject({ busy: true })
    expect(opacityAround('Save')).toBe(0)
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('shows its words again once it settles', async () => {
    const view = await render(themed(<HelixButton pending>Save</HelixButton>))
    await view.rerender(themed(<HelixButton>Save</HelixButton>))
    expect(opacityAround('Save')).toBe(1)
  })
})
