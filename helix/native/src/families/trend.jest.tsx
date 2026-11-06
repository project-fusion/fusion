/*
 * The generated Trend, drawn from its real intermediate form: the arrow for
 * the movement and the change in the trend's color, judged by `good`, the
 * movement said in words out of sight, and the change `value` writes in a
 * locale. `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { type Locale, locale, setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { fakeLocale } from '@fusion.dev/helix-core/capabilities/locale/fake'
import { clearWords, registerWords } from '@fusion.dev/helix-core/words'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { nodes, styleOf } from './drawn'
import { HelixTrend, type HelixTrendProps } from './trend/index.native'

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

const reader: Locale = locale()

beforeEach(() => {
  atTextSize(1)
  setLocale(fakeLocale('en-US'))
})

afterEach(() => {
  setLocale(reader)
  clearWords()
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

/** The glyph drawn for `name`, hidden from screen readers or not. */
const glyph = (name: string) => screen.getByTestId(`glyph ${name}`, { includeHiddenElements: true })

/** The color the glyph `name` is drawn in. */
const colorOf = (name: string) => styleOf(glyph(name)).backgroundColor

describe('the arrow', () => {
  test.each([
    ['up', 'arrow-up'],
    ['down', 'arrow-down'],
    ['neutral', 'minus'],
  ])('a move %s draws %s', async (movement, name) => {
    await render(themed(<HelixTrend movement={movement as 'up'}>8%</HelixTrend>))
    expect(glyph(name)).toBeTruthy()
  })

  test('a movement that is none of the three draws the bar', async () => {
    await render(themed(<HelixTrend movement={'sideways' as 'up'}>7</HelixTrend>))
    expect(glyph('minus')).toBeTruthy()
  })

  test('reads the old `direction` where `movement` is absent', async () => {
    await render(themed(<HelixTrend direction="up">4%</HelixTrend>))
    expect(glyph('arrow-up')).toBeTruthy()
  })

  test('is an em of the words, and is hidden, as the movement is said in words', async () => {
    await render(themed(<HelixTrend movement="up">8%</HelixTrend>))
    expect(styleOf(glyph('arrow-up')).height).toBe(tokens['text-sm'])
    expect(isHiddenFromAccessibility(glyph('arrow-up'))).toBe(true)
  })

  test('takes a glyph passed in for its movement, or for every movement', async () => {
    const view = await render(
      themed(
        <HelixTrend
          downIcon={<Text>minus sign</Text>}
          movement="up"
          upIcon={<Text>plus sign</Text>}
        >
          5%
        </HelixTrend>,
      ),
    )
    expect(screen.getByText('plus sign', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.queryByText('minus sign', { includeHiddenElements: true })).toBeNull()
    expect(screen.queryByTestId('glyph arrow-up', { includeHiddenElements: true })).toBeNull()
    expect(
      isHiddenFromAccessibility(screen.getByText('plus sign', { includeHiddenElements: true })),
    ).toBe(true)
    await view.rerender(themed(<HelixTrend icon={<Text>star</Text>} movement="down" />))
    expect(screen.getByText('star', { includeHiddenElements: true })).toBeTruthy()
  })
})

describe('the color', () => {
  test('is gray until `good` judges the move', async () => {
    await render(themed(<HelixTrend movement="up">8%</HelixTrend>))
    expect(colorOf('arrow-up')).toBe(tokens['color-foreground-muted'])
    expect(styleOf(screen.getByText('8%')).color).toBe(tokens['color-foreground-muted'])
  })

  test('is success for a move the way `good` names, and danger against it', async () => {
    await render(themed(<HelixTrend good="up" movement="up" />))
    expect(colorOf('arrow-up')).toBe(tokens['color-success'])
    await render(themed(<HelixTrend good="up" movement="down" />))
    expect(colorOf('arrow-down')).toBe(tokens['color-danger'])
  })

  test('stays gray for a move that is no move, whatever `good` says', async () => {
    await render(themed(<HelixTrend good="up" movement="neutral" />))
    expect(colorOf('minus')).toBe(tokens['color-foreground-muted'])
  })

  test('follows the market under `color-by="movement"`, over the judgment', async () => {
    await render(themed(<HelixTrend colorBy="movement" good="down" movement="up" />))
    expect(colorOf('arrow-up')).toBe(tokens['color-rise'])
    await render(themed(<HelixTrend colorBy="movement" good="up" movement="down" />))
    expect(colorOf('arrow-down')).toBe(tokens['color-fall'])
  })

  test('leaves the label gray and regular', async () => {
    await render(themed(<HelixTrend good="up" label="this month" movement="up" />))
    expect(styleOf(screen.getByText('this month'))).toMatchObject({
      color: tokens['color-foreground-muted'],
      fontWeight: '400',
    })
  })
})

describe('what a screen reader hears', () => {
  test.each([
    [{ good: 'up', movement: 'up' }, 'Up, better'],
    [{ good: 'up', movement: 'down' }, 'Down, worse'],
    [{ movement: 'down' }, 'Down'],
    [{ good: 'down', movement: 'neutral' }, 'Unchanged'],
  ])('%o says "%s", out of sight', async (props, said) => {
    await render(themed(<HelixTrend {...(props as HelixTrendProps)} />))
    const words = screen.getByText(said)
    expect(isHiddenFromAccessibility(words)).toBe(false)
    const box = nodes(screen.toJSON()).find((node) =>
      (node.children ?? []).some(
        (child) => typeof child !== 'string' && child.children?.[0] === said,
      ),
    )
    expect(styleOf(box as never)).toMatchObject({
      height: 1,
      overflow: 'hidden',
      position: 'absolute',
      width: 1,
    })
  })

  test('says the words its props give, in their order', async () => {
    await render(
      themed(
        <HelixTrend
          betterLabel="besser"
          good="up"
          judgmentLabel="{judgment, select, better {{betterLabel}: {direction}} other {{direction}}}"
          movement="up"
          upLabel="Gestiegen"
        />,
      ),
    )
    expect(screen.getByText('besser: Gestiegen')).toBeTruthy()
  })

  test('says the words registered for its locale', async () => {
    registerWords('de', { 'helix-trend': { betterLabel: 'besser', upLabel: 'Gestiegen' } })
    await render(themed(<HelixTrend good="up" locale="de" movement="up" />))
    expect(screen.getByText('Gestiegen, besser')).toBeTruthy()
  })
})

describe('the change `value` writes', () => {
  test('sets the movement by its sign and writes its size with no sign', async () => {
    await render(
      themed(
        <HelixTrend
          formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
          good="down"
          value={-0.004}
        />,
      ),
    )
    expect(glyph('arrow-down')).toBeTruthy()
    expect(colorOf('arrow-down')).toBe(tokens['color-success'])
    expect(screen.getByText('0.4%')).toBeTruthy()
    expect(screen.getByText('Down, better')).toBeTruthy()
  })

  test('writes the sign where `signDisplay` asks for it', async () => {
    await render(
      themed(
        <HelixTrend
          formatOptions={{ maximumFractionDigits: 1, signDisplay: 'always', style: 'percent' }}
          locale="en-US"
          value={0.084}
        />,
      ),
    )
    expect(screen.getByText('+8.4%')).toBeTruthy()
  })

  test('is written in the locale it names, compact or signed', async () => {
    await render(
      themed(<HelixTrend formatOptions={{ notation: 'compact' }} locale="en-US" value={1500000} />),
    )
    expect(screen.getByText('1.5M')).toBeTruthy()
    await render(
      themed(
        <HelixTrend
          formatOptions={{ maximumFractionDigits: 1, signDisplay: 'always', style: 'percent' }}
          locale="de"
          value={0.084}
        />,
      ),
    )
    expect(screen.getByText('+8,4 %')).toBeTruthy()
  })

  test("is written in the reader's locale where it names none, from the web's JSON", async () => {
    setLocale(fakeLocale('de-DE'))
    await render(
      themed(<HelixTrend formatOptions={'{"useGrouping":true}' as never} value={-1234.5} />),
    )
    expect(screen.getByText('1.234,5')).toBeTruthy()
  })

  test('draws nothing for a trend with no number, and `movement` wins over the sign', async () => {
    const view = await render(themed(<HelixTrend movement="up" value={-3} />))
    expect(glyph('arrow-up')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    await view.rerender(themed(<HelixTrend movement="up">12.4%</HelixTrend>))
    expect(screen.queryByText('12.4')).toBeNull()
    expect(screen.getByText('12.4%')).toBeTruthy()
  })
})

describe('large text', () => {
  test('the words grow fully, and the arrow stops at 1.353 times', async () => {
    await render(themed(<HelixTrend movement="up">8%</HelixTrend>))
    const words = Number(tokens['text-sm'])
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('8%')).fontSize).toBeCloseTo(words * 3.571, 1)
    expect(styleOf(glyph('arrow-up')).height).toBeCloseTo(words * 1.353, 1)
  })
})
