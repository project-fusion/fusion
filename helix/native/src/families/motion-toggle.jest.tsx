/*
 * The generated Motion Toggle, drawn from its real intermediate form: one
 * toggle button that pauses the app's motion, which every Motion Toggle in
 * the app shares, and while it is paused every Helix component draws as it
 * does under reduced motion. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { motionPaused, pauseMotion } from '../render/motion'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixIcon } from './icon/index.native'
import {
  HelixMotionToggle,
  type HelixMotionToggleBeforeCheckEvent,
} from './motion-toggle/index.native'

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

/* React Native's Jest setup reports a font scale of 2, and a spec starts at
   the default size, with the app's motion running. */
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

afterEach(async () => {
  await act(() => pauseMotion(false))
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

/** Every Motion Toggle a screen reader reaches. */
const toggles = () => screen.getAllByRole('togglebutton', { name: 'Pause motion' })

/** The first Motion Toggle a screen reader reaches. */
const first = () => {
  const [one] = toggles()
  if (one === undefined) {
    throw new Error('no Motion Toggle is drawn')
  }
  return one
}

/** Whether a screen reader hears each Motion Toggle as pressed. */
const pressed = (): unknown[] => toggles().map((one) => one.props.accessibilityState?.checked)

/** The glyphs drawn, by name. */
const glyphs = (): string[] =>
  screen
    .queryAllByTestId(/^glyph /, { includeHiddenElements: true })
    .map((one) => String(one.props.testID).slice('glyph '.length))

describe('a Motion Toggle', () => {
  test('is a toggle button named by its label, not pressed, showing pause', async () => {
    await render(themed(<HelixMotionToggle />))
    expect(pressed()).toEqual([false])
    expect(glyphs()).toEqual(['pause'])
  })

  test('takes its name from `label`, and keeps it whichever way it stands', async () => {
    await render(themed(<HelixMotionToggle label="Bewegung anhalten" />))
    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Bewegung anhalten' }))
    expect(screen.getByRole('togglebutton', { name: 'Bewegung anhalten' })).toBeTruthy()
  })

  test('draws words passed in beside its icon', async () => {
    await render(themed(<HelixMotionToggle>Pause motion</HelixMotionToggle>))
    expect(screen.getByText('Pause motion')).toBeTruthy()
    expect(glyphs()).toEqual(['pause'])
  })

  test('draws an icon passed into `icon` in place of its own', async () => {
    await render(themed(<HelixMotionToggle icon={<HelixIcon name="hand" />} />))
    expect(glyphs()).toEqual(['hand'])
  })
})

describe('a press on a Motion Toggle', () => {
  test('asks with `checked` true, pauses the app’s motion, then tells', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixMotionToggle
          onBeforeCheck={(event) => heard.push(`before ${event.detail.checked} ${motionPaused()}`)}
          onChange={() => heard.push(`change ${motionPaused()}`)}
        />,
      ),
    )
    await fireEvent.press(first())
    expect([pressed(), motionPaused(), glyphs()]).toEqual([[true], true, ['play']])
    await fireEvent.press(first())
    expect([pressed(), motionPaused(), glyphs()]).toEqual([[false], false, ['pause']])
    expect(heard).toEqual(['before true false', 'change true', 'before false true', 'change false'])
  })

  test('leaves the motion as it is where `helix-before-check` is refused', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixMotionToggle
          onBeforeCheck={(event: HelixMotionToggleBeforeCheckEvent) => event.preventDefault()}
          onChange={() => heard.push('change')}
        />,
      ),
    )
    await fireEvent.press(first())
    expect([pressed(), motionPaused(), heard]).toEqual([[false], false, []])
  })

  test('turns on Enter and on Space, as a button presses', async () => {
    await render(themed(<HelixMotionToggle />))
    await pressKey('Enter')
    expect(motionPaused()).toBe(true)
    await pressKey(' ')
    expect(motionPaused()).toBe(false)
  })
})

describe('the app’s motion', () => {
  test('is one choice: two Motion Toggles agree, and the app’s own pause reaches both', async () => {
    const heard: string[] = []
    await render(
      themed(
        <>
          <HelixMotionToggle onChange={() => heard.push('first')} />
          <HelixMotionToggle onChange={() => heard.push('second')} />
        </>,
      ),
    )
    await fireEvent.press(first())
    expect(pressed()).toEqual([true, true])
    await act(() => pauseMotion(false))
    expect(pressed()).toEqual([false, false])
    /* Only the press that turned one tells. */
    expect(heard).toEqual(['first'])
  })

  test('paused, draws every Helix component as reduced motion does', async () => {
    const view = await render(themed(<HelixIcon animation="spin" name="arrow-clockwise" />))
    expect(styleOf(view.toJSON() as never)).toHaveProperty('animationName')
    await act(() => pauseMotion(true))
    expect(styleOf(view.toJSON() as never)).not.toHaveProperty('animationName')
    await act(() => pauseMotion(false))
    expect(styleOf(view.toJSON() as never)).toHaveProperty('animationName')
  })
})

describe('what a phone draws of a Motion Toggle', () => {
  test('a floating button with a small icon, filled deeper while paused', async () => {
    await render(
      themed(
        <>
          <HelixMotionToggle />
          <Token name="color-surface-overlay" />
          <Token name="size-icon-sm" />
          <Token name="size-control-sm" />
        </>,
      ),
    )
    const resting = styleOf(first())
    expect(resting.backgroundColor).toBe(tokenOf('color-surface-overlay'))
    expect(resting.boxShadow).toBeTruthy()
    expect(String(resting.minHeight)).toBe(tokenOf('size-control-sm'))
    const glyph = styleOf(screen.getByTestId('glyph pause', { includeHiddenElements: true }))
    expect(String(glyph.height)).toBe(tokenOf('size-icon-sm'))
    await fireEvent.press(first())
    expect(styleOf(first()).backgroundColor).not.toBe(resting.backgroundColor)
  })

  test('stops its icon and its least size growing at 1.353 times the default text size', async () => {
    await render(themed(<HelixMotionToggle />))
    const icon = styleOf(screen.getByTestId('glyph pause', { includeHiddenElements: true }))
      .height as number
    const least = styleOf(first()).minHeight as number
    await act(() => atTextSize(3.571))
    const grown = styleOf(screen.getByTestId('glyph pause', { includeHiddenElements: true }))
    expect(grown.height).toBeCloseTo(icon * 1.353, 1)
    expect(styleOf(first()).minHeight).toBeCloseTo(least * 1.353, 1)
  })
})
