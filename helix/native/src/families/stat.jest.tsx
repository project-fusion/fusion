/*
 * The generated Stat and Stat Group, drawn from their real intermediate
 * forms: a figure with the label that names it, its unit on its baseline and
 * the Trend that qualifies it, a group named by the label, and a row of stats
 * that wraps, shares equal columns, or draws a rule between them.
 * `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { type Locale, locale, setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { fakeLocale } from '@fusion.dev/helix-core/capabilities/locale/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixStat, HelixStatGroup } from './stat/index.native'
import { HelixTrend } from './trend/index.native'

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

/** The first view drawn, the host. */
const hostOf = (json: unknown): Drawn => (Array.isArray(json) ? json[0] : json) as Drawn

/** The words each text of the host holds, in the order they are drawn. */
const order = (json: unknown): string[] =>
  nodes(json)
    .filter((node) => node.type === 'Text')
    .map(wordsOf)

/** The view that lays out the figure and its unit on one line. */
const lineOf = (json: unknown): Drawn | undefined =>
  nodes(json).find((node) => styleOf(node).alignItems === 'baseline' && node !== hostOf(json))

describe('the generated Stat', () => {
  test('stacks the label, the figure and its unit on one line, and the trend', async () => {
    const view = await render(
      themed(
        <HelixStat
          label="Response time"
          trend={<HelixTrend movement="up">18ms</HelixTrend>}
          unit="ms"
        >
          212
        </HelixStat>,
      ),
    )
    const json = view.toJSON()
    expect(styleOf(hostOf(json))).toMatchObject({
      flexDirection: 'column',
      gap: tokens['space-2xs'],
    })
    expect(order(json)).toEqual(['Response time', '212', 'ms', 'Up', '18ms'])
    expect(styleOf(lineOf(json) as Drawn)).toMatchObject({
      alignItems: 'baseline',
      flexDirection: 'row',
      gap: tokens['space-2xs'],
    })
    expect(wordsOf(lineOf(json) as Drawn)).toBe('212ms')
  })

  test('sets the figure large, the label small and tracked, and the unit quieter', async () => {
    await render(
      themed(
        <HelixStat label="Uptime" unit="%">
          98.2
        </HelixStat>,
      ),
    )
    expect(styleOf(screen.getByText('98.2'))).toMatchObject({
      color: tokens['color-foreground'],
      fontSize: tokens['text-3xl'],
      fontWeight: '600',
    })
    const label = styleOf(screen.getByText('Uptime'))
    expect(label.color).toBe(tokens['color-foreground-muted'])
    expect(label.fontSize).toBeCloseTo(Number(tokens['text-xs']), 0)
    expect(label.fontWeight).toBe('500')
    expect(styleOf(screen.getByText('%'))).toMatchObject({
      color: tokens['color-foreground-muted'],
      fontSize: tokens['text-md'],
    })
  })

  test('draws the label after the figure and the trend under `column-reverse`', async () => {
    const view = await render(
      themed(
        <HelixStat
          direction="column-reverse"
          label="Active users"
          trend={<HelixTrend movement="down" />}
        >
          1,284
        </HelixStat>,
      ),
    )
    expect(order(view.toJSON())).toEqual(['1,284', 'Down', 'Active users'])
  })

  test('lays the pieces side by side on one baseline in a row', async () => {
    const view = await render(
      themed(
        <HelixStat direction="row" label="Uptime" unit="%">
          98.2
        </HelixStat>,
      ),
    )
    const json = view.toJSON()
    expect(styleOf(hostOf(json))).toMatchObject({
      alignItems: 'baseline',
      flexDirection: 'row',
      gap: tokens['space-xs'],
    })
    expect(styleOf(lineOf(json) as Drawn).gap).toBe(tokens['space-xs'])
    expect(order(json)).toEqual(['Uptime', '98.2', '%'])
  })
})

describe('the figure `value` writes', () => {
  test('is written in the locale it names, compact or as a percent', async () => {
    await render(
      themed(
        <HelixStat
          formatOptions={{ notation: 'compact' }}
          label="Requests"
          locale="en-US"
          value={1234567}
        />,
      ),
    )
    expect(screen.getByText('1.2M')).toBeTruthy()
    await render(
      themed(
        <HelixStat
          formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
          label="Uptime"
          locale="de"
          value={0.982}
        />,
      ),
    )
    expect(screen.getByText('98,2 %')).toBeTruthy()
  })

  test("is written in the reader's locale where it names none, from the web's JSON", async () => {
    setLocale(fakeLocale('de-DE'))
    await render(
      themed(<HelixStat formatOptions={'{"notation":"compact"}' as never} value={1234567} />),
    )
    expect(screen.getByText('1,2 Mio.')).toBeTruthy()
  })

  test('takes the place of the figure passed in, in its style', async () => {
    await render(themed(<HelixStat value={42}>passed</HelixStat>))
    expect(screen.queryByText('passed')).toBeNull()
    expect(styleOf(screen.getByText('42')).fontSize).toBe(tokens['text-3xl'])
  })
})

describe('what a screen reader hears', () => {
  test('a stat with a label is a group named by the label', async () => {
    const view = await render(themed(<HelixStat label="Active users">1,284</HelixStat>))
    expect(hostOf(view.toJSON()).props).toMatchObject({
      accessibilityLabel: 'Active users',
      role: 'group',
    })
  })

  test('a stat with no label has no role', async () => {
    const view = await render(themed(<HelixStat>1,284</HelixStat>))
    expect(hostOf(view.toJSON()).props.role).toBeUndefined()
  })

  test('the trend it holds says its movement inside the group, after the figure', async () => {
    await render(
      themed(
        <HelixStat
          label="Active users"
          trend={
            <HelixTrend good="up" label="this month" movement="up">
              12%
            </HelixTrend>
          }
        >
          1,284
        </HelixStat>,
      ),
    )
    expect(screen.getByText('Up, better')).toBeTruthy()
    expect(styleOf(screen.getByText('12%')).color).toBe(tokens['color-success'])
  })

  test('a stat group is a group while it has a label, and none without', async () => {
    const named = await render(themed(<HelixStatGroup label="Usage" />))
    expect(hostOf(named.toJSON()).props).toMatchObject({
      accessibilityLabel: 'Usage',
      role: 'group',
    })
    const plain = await render(themed(<HelixStatGroup />))
    expect(hostOf(plain.toJSON()).props.role).toBeUndefined()
  })
})

describe('the generated Stat Group', () => {
  test('wraps its stats, each its own width, apart by the gap', async () => {
    const view = await render(
      themed(
        <HelixStatGroup>
          <HelixStat label="Open">12</HelixStat>
          <HelixStat label="Closed">8</HelixStat>
        </HelixStatGroup>,
      ),
    )
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens['space-2xl'],
    })
  })

  test('draws a rule before each stat and clips the one that starts a row', async () => {
    const view = await render(
      themed(
        <HelixStatGroup divided>
          <HelixStat label="Open">12</HelixStat>
          <HelixStat label="Closed">8</HelixStat>
        </HelixStatGroup>,
      ),
    )
    const json = view.toJSON()
    const gap = Number(tokens['space-2xl'])
    expect(styleOf(hostOf(json))).toMatchObject({ columnGap: gap * 2, overflow: 'hidden' })
    const stat = nodes(json).find((node) => node.props.accessibilityLabel === 'Open')
    expect(styleOf(stat as Drawn)).toMatchObject({
      borderStartColor: tokens['color-border'],
      borderStartWidth: tokens['border-thin'],
      marginStart: -gap - Number(tokens['border-thin']),
      paddingStart: gap,
    })
  })

  test('shares the row among equal columns under `columns`', async () => {
    const view = await render(
      themed(
        <HelixStatGroup columns={3}>
          <HelixStat label="Open">12</HelixStat>
          <HelixStat label="Closed">8</HelixStat>
          <HelixStat label="Stale">3</HelixStat>
        </HelixStatGroup>,
      ),
    )
    const json = view.toJSON()
    expect(styleOf(hostOf(json)).flexDirection).toBe('column')
    /* Until the grid has its width, its cells are drawn one to a line. */
    const cells = nodes(json).filter((node) => styleOf(node).width === '100%')
    expect(cells).toHaveLength(3)
    expect(cells.map(wordsOf)).toEqual(['Open12', 'Closed8', 'Stale3'])
  })
})

describe('large text', () => {
  test('the figure and the label grow fully, and the gaps stop at 1.353 times', async () => {
    const view = await render(
      themed(
        <HelixStat label="Uptime" unit="%">
          98.2
        </HelixStat>,
      ),
    )
    const figure = Number(tokens['text-3xl'])
    const gap = Number(tokens['space-2xs'])
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('98.2')).fontSize).toBeCloseTo(figure * 3.571, 0)
    expect(styleOf(hostOf(view.toJSON())).gap).toBeCloseTo(gap * 1.353, 1)
  })
})
