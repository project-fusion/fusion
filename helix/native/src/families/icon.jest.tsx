/*
 * The generated Icon, drawn from its real intermediate form: the named glyph,
 * at the icon's size, in the color of the words around it, announced as an
 * image only where it is labeled. `test:native` writes the component beside
 * this file, as the styled package's build writes the one it ships.
 */
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { glyphs } from '../render/vector'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { HelixIcon } from './icon/index.native'
import { HelixTab, HelixTabs } from './tabs/index.native'

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

const original: Environment = environment()

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

afterEach(() => {
  setEnvironment(original)
})

const themed = (children: ReactNode, tokens?: Readonly<Record<string, number | string>>) => (
  <HelixTheme
    Glyph={Recorded}
    mode="light"
    {...(tokens === undefined ? {} : { tokens: { dark: tokens, light: tokens } })}
  >
    {children}
  </HelixTheme>
)

/** The glyph drawn for `name`, hidden from screen readers or not. */
const glyph = (name: string) => screen.getByTestId(`glyph ${name}`, { includeHiddenElements: true })

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The size and color a glyph was asked for. */
const asked = (name: string) => {
  const { backgroundColor, height, width } = styleOf(glyph(name))
  return { color: backgroundColor, height, width }
}

/** Shows the theme's foreground, as the theme draws it. */
const Foreground = () => <View testID={`foreground ${useTokens()['color-foreground']}`} />

describe('the generated Icon', () => {
  test('draws the glyph its name names, with the Glyph the app gives', async () => {
    await render(themed(<HelixIcon name="gear" />))
    expect(glyph('gear')).toBeTruthy()
  })

  test('draws a named icon from helix-icons markup through glyphs()', async () => {
    const Glyph = glyphs((name) =>
      name === 'check' ? { content: '<path d="M2 8l4 4 8-8"/>', viewBox: '0 0 16 16' } : undefined,
    )
    const view = await render(
      <HelixTheme Glyph={Glyph} mode="light">
        <HelixIcon name="check" />
      </HelixTheme>,
    )
    expect(JSON.stringify(view.toJSON())).toContain('RNSVG')
    await view.rerender(
      <HelixTheme Glyph={Glyph} mode="light">
        <HelixIcon name="missing" />
      </HelixTheme>,
    )
    expect(JSON.stringify(view.toJSON())).not.toContain('RNSVG')
  })

  test('draws nothing where no name is given', async () => {
    await render(themed(<HelixIcon />))
    expect(screen.queryByTestId(/^glyph/, { includeHiddenElements: true })).toBeNull()
  })
})

describe('what a screen reader hears', () => {
  test('a labeled icon is an image with its label, reached as one element', async () => {
    await render(themed(<HelixIcon label="Warning" name="warning" />))
    const image = screen.getByLabelText('Warning')
    expect(image.props).toMatchObject({ accessibilityRole: 'image', accessible: true })
    expect(isHiddenFromAccessibility(glyph('warning'))).toBe(false)
  })

  test('an icon with no label is decorative, and hidden', async () => {
    await render(themed(<HelixIcon name="gear" />))
    expect(isHiddenFromAccessibility(glyph('gear'))).toBe(true)
    expect(screen.queryByRole('image')).toBeNull()
  })
})

describe('the size', () => {
  test('is the icon step, 1.25 rem, filling the box the host sizes', async () => {
    const view = await render(themed(<HelixIcon name="gear" />))
    expect(asked('gear')).toMatchObject({ height: 20, width: 20 })
    expect(styleOf(view.toJSON() as never)).toMatchObject({ height: 20, width: 20 })
  })

  test('stops growing at the largest standard text size, 1.353 times', async () => {
    await render(themed(<HelixIcon name="gear" />))
    await act(() => atTextSize(1.2))
    expect(asked('gear').height).toBe(24)
    await act(() => atTextSize(3.571))
    expect(asked('gear').height).toBeCloseTo(20 * 1.353, 1)
  })

  test('follows the icon step a theme sets, as `--helix-size-icon` does', async () => {
    await render(themed(<HelixIcon name="gear" />, { 'size-icon': '2rem' }))
    expect(asked('gear').height).toBe(32)
  })

  test('takes `--icon-size` from the element around it, as a tab sizes its close glyph', async () => {
    await render(
      themed(
        <HelixTabs>
          <HelixTab dismissIcon={<HelixIcon name="x-circle" />} dismissible value="a">
            Alpha
          </HelixTab>
        </HelixTabs>,
      ),
    )
    /* An em of the tab's words, `1em` in `--icon-size`. */
    expect(asked('x-circle').height).toBe(styleOf(screen.getByText('Alpha')).fontSize)
  })
})

describe('the color', () => {
  test("is the page's foreground on its own", async () => {
    await render(
      themed(
        <>
          <HelixIcon name="gear" />
          <Foreground />
        </>,
      ),
    )
    expect(screen.getByTestId(`foreground ${asked('gear').color}`)).toBeTruthy()
  })

  test("is the words' color in the region it is passed into", async () => {
    await render(
      themed(
        <HelixButton emphasis="solid" start={<HelixIcon name="play" />} tone="primary">
          Play
        </HelixButton>,
      ),
    )
    expect(asked('play').color).toBe(styleOf(screen.getByText('Play')).color)
  })
})

describe('turning, flipping and moving', () => {
  /** The box the glyph is drawn in, the `svg` part. */
  const part = (name: string) => glyph(name).parent

  test('turns and flips the glyph inside its box', async () => {
    await render(themed(<HelixIcon flip="x" name="arrow-right" rotate={90} />))
    expect(styleOf(part('arrow-right') as never).transform).toEqual([
      { rotate: '90deg' },
      { scaleX: -1 },
      { scaleY: 1 },
    ])
  })

  test('spins the whole icon once every three of `duration-slow`', async () => {
    const view = await render(themed(<HelixIcon animation="spin" name="arrow-clockwise" />))
    expect(styleOf(view.toJSON() as never)).toMatchObject({
      animationDuration: 960,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    })
  })

  test('stands still where the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const view = await render(themed(<HelixIcon animation="pulse" name="star" />))
    expect(styleOf(view.toJSON() as never)).not.toHaveProperty('animationName')
  })
})
