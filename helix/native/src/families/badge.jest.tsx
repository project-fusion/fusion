/*
 * The generated Badge, drawn from its real intermediate form: a count, a dot
 * or words pinned to the corner of what it wraps, worked out by core's badge
 * derivations, named as a status, and moved by its attention keyframes until
 * the reader or the app asks for less motion. `test:native` writes the
 * component beside this file, as the styled package's build writes the one
 * it ships.
 */
import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { type Locale, locale, setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { fakeLocale } from '@fusion.dev/helix-core/capabilities/locale/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text, View } from 'react-native'
import { pauseMotion } from '../render/motion'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixBadge } from './badge/index.native'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
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

const system: Environment = environment()
const reader: Locale = locale()

beforeEach(() => {
  atTextSize(1)
  setLocale(fakeLocale('en-US'))
})

const spoken: Announce = announce()

afterEach(() => {
  setEnvironment(system)
  setLocale(reader)
  setAnnounce(spoken)
  pauseMotion(false)
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

/** The badge's mark, the view that is a status. */
const markOf = (json: unknown): Drawn => {
  const found = nodes(json).find((node) => node.props.role === 'status')
  if (found === undefined) {
    throw new Error('no mark is drawn')
  }
  return found
}

/** What the mark is drawn with, its transform's moves by name. */
const moved = (mark: Drawn): Readonly<Record<string, unknown>> =>
  Object.assign({}, ...((styleOf(mark).transform as object[] | undefined) ?? []))

/** A badge on a button-sized box. */
const on = (badge: Readonly<Record<string, unknown>>) =>
  themed(
    <HelixBadge {...badge}>
      <Text>Inbox</Text>
    </HelixBadge>,
  )

describe('the mark', () => {
  test('is pinned to the top end corner of what it wraps, pulled in a quarter of its size', async () => {
    const view = await render(on({ value: 8 }))
    const mark = markOf(view.toJSON())
    const size = Number(tokens['size-badge'])
    expect(styleOf(mark)).toMatchObject({
      backgroundColor: tokens['color-primary-surface'],
      borderRadius: tokens['radii-full'],
      end: size / 4,
      height: size,
      minWidth: size,
      pointerEvents: 'none',
      position: 'absolute',
      top: size / 4,
    })
    expect(moved(mark)).toMatchObject({ translateX: '50%', translateY: '-50%' })
    expect(styleOf(mark).boxShadow).toContain(String(tokens['color-background']))
    expect(screen.getByText('Inbox')).toBeTruthy()
  })

  test('shows the count in the ink of its fill, on one line', async () => {
    await render(on({ value: 12 }))
    const count = screen.getByText('12')
    expect(styleOf(count)).toMatchObject({
      color: tokens['color-foreground-on-primary'],
      fontSize: tokens['text-xs'],
    })
    expect(count.props.numberOfLines).toBe(1)
  })

  test('is a circle round one character, with no inline padding', async () => {
    const one = await render(on({ value: 3 }))
    expect(styleOf(markOf(one.toJSON())).paddingHorizontal).toBe(0)
    const two = await render(on({ value: 12 }))
    expect(styleOf(markOf(two.toJSON())).paddingHorizontal).toBe(tokens['space-2xs'])
  })
})

describe('the count', () => {
  test('past `max` writes the maximum and a plus sign', async () => {
    await render(on({ label: '{count} new', max: 99, value: 120 }))
    expect(screen.getByText('99+')).toBeTruthy()
    expect(screen.getByLabelText('99+ new')).toBeTruthy()
  })

  test('takes `max` and `value` as the words of numbers, as the web attribute holds them', async () => {
    await render(on({ max: '9', value: '42' }))
    expect(screen.getByText('9+')).toBeTruthy()
  })

  test('is written compact in the locale it names', async () => {
    const english = await render(
      on({ formatOptions: { notation: 'compact' }, locale: 'en-US', value: 1200 }),
    )
    expect(wordsOf(markOf(english.toJSON()))).toBe('1.2K')
    const german = await render(
      on({ formatOptions: { notation: 'compact' }, locale: 'de', value: 1234567 }),
    )
    expect(wordsOf(markOf(german.toJSON()))).toBe('1,2\u00a0Mio.')
  })

  test('takes its options as the JSON the web attribute holds', async () => {
    const view = await render(
      on({ formatOptions: '{"useGrouping":true}', locale: 'de', value: 1234 }),
    )
    expect(wordsOf(markOf(view.toJSON()))).toBe('1.234')
  })

  test("is written in the reader's locale where it names none", async () => {
    setLocale(fakeLocale('de-DE'))
    const view = await render(on({ formatOptions: { useGrouping: true }, value: 1234 }))
    expect(wordsOf(markOf(view.toJSON()))).toBe('1.234')
  })

  test('shows words as they are given', async () => {
    const view = await render(on({ tone: 'accent', value: 'New' }))
    expect(wordsOf(markOf(view.toJSON()))).toBe('New')
  })
})

describe('what a screen reader hears', () => {
  test('a count is a status named by its label, reached as one element', async () => {
    const view = await render(on({ label: '{count} unread', value: 8 }))
    expect(markOf(view.toJSON()).props).toMatchObject({
      accessibilityLabel: '8 unread',
      accessibilityLiveRegion: 'polite',
      accessible: true,
      role: 'status',
    })
  })

  test('says a new count on iOS as it changes, and nothing as it arrives', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const view = await render(on({ label: '{count} unread', value: 8 }))
    expect(said.said).toEqual([])
    await view.rerender(on({ label: '{count} unread', value: 9 }))
    await view.rerender(on({ label: '{count} unread', value: 0 }))
    expect(said.said).toEqual([{ message: '9 unread', urgency: 'polite' }])
  })

  test('a count with no label is named by what it shows', async () => {
    const view = await render(on({ value: 3 }))
    expect(markOf(view.toJSON()).props.accessibilityLabel).toBe('3')
  })

  test('a label picks its plural form by the count', async () => {
    const label = '{count, plural, one {{count} message} other {{count} messages}}'
    const one = await render(on({ label, value: 1 }))
    expect(markOf(one.toJSON()).props.accessibilityLabel).toBe('1 message')
    const many = await render(on({ label, value: 4 }))
    expect(markOf(many.toJSON()).props.accessibilityLabel).toBe('4 messages')
  })

  test('a dot with a label is a status named by it', async () => {
    const view = await render(on({ label: 'Unread messages' }))
    expect(markOf(view.toJSON()).props).toMatchObject({
      accessibilityLabel: 'Unread messages',
      role: 'status',
    })
  })

  test('a dot with no label is drawn and hidden, as it says nothing', async () => {
    const view = await render(on({}))
    expect(markOf(view.toJSON()).props).toMatchObject({
      importantForAccessibility: 'no-hide-descendants',
    })
    expect(markOf(view.toJSON()).props.accessibilityLabel).toBeUndefined()
  })

  test('an icon in the mark is hidden, as the count and the label say it', async () => {
    await render(
      themed(
        <HelixBadge icon={<HelixIcon name="x" />} label="{count} failing" tone="danger" value={2}>
          <Text>Checks</Text>
        </HelixBadge>,
      ),
    )
    const glyph = screen.getByTestId('glyph x', { includeHiddenElements: true })
    expect(isHiddenFromAccessibility(glyph)).toBe(true)
    expect(screen.getByLabelText('2 failing')).toBeTruthy()
  })
})

describe('a dot and a blank', () => {
  test('no value is a dot of its own size, with no count', async () => {
    const view = await render(on({ tone: 'danger' }))
    const mark = markOf(view.toJSON())
    expect(styleOf(mark)).toMatchObject({
      backgroundColor: tokens['color-danger-surface'],
      minHeight: tokens['space-xs'],
      minWidth: tokens['space-xs'],
      paddingHorizontal: 0,
    })
    expect(styleOf(mark).height).toBe('auto')
    expect(wordsOf(mark)).toBe('')
  })

  test('an icon alone is the whole mark, an inset round it', async () => {
    const view = await render(
      themed(
        <HelixBadge icon={<HelixIcon name="check" />} label="Verified" tone="success">
          <Text>Jane</Text>
        </HelixBadge>,
      ),
    )
    const glyph = screen.getByTestId('glyph check', { includeHiddenElements: true })
    expect(styleOf(glyph).height).toBe(tokens['text-xs'])
    const icon = nodes(view.toJSON()).find((node) =>
      nodes(node).some((inner) => inner.props.testID === 'glyph check'),
    )
    expect(
      nodes(icon).some((node) => styleOf(node).margin === Number(tokens['space-2xs']) / 2),
    ).toBe(true)
  })

  test('zero shrinks and fades the mark out, and says nothing', async () => {
    const view = await render(on({ value: 0 }))
    const mark = markOf(view.toJSON())
    expect(styleOf(mark).opacity).toBe(0)
    expect(moved(mark)).toMatchObject({ scaleX: 0, scaleY: 0 })
    expect(mark.props.importantForAccessibility).toBe('no-hide-descendants')
  })
})

describe('the tones and emphases', () => {
  test.each([
    ['primary', 'color-primary-surface', 'color-foreground-on-primary'],
    ['accent', 'color-accent-surface', 'color-foreground-on-accent'],
    ['info', 'color-info-surface', 'color-foreground-on-status'],
    ['success', 'color-success-surface', 'color-foreground-on-status'],
    ['warning', 'color-warning-surface', 'color-foreground-on-status'],
    ['danger', 'color-danger-surface', 'color-foreground-on-status'],
    ['neutral', 'color-surface-raised', 'color-foreground'],
  ])('%s fills with its surface and writes in its ink', async (tone, fill, ink) => {
    const view = await render(on({ tone, value: 5 }))
    expect(styleOf(markOf(view.toJSON())).backgroundColor).toBe(tokens[fill])
    expect(styleOf(screen.getByText('5')).color).toBe(tokens[ink])
  })

  test('outlined draws the fill as a ring inside, on the page, in its ink', async () => {
    const view = await render(on({ emphasis: 'outlined', tone: 'danger', value: 5 }))
    const style = styleOf(markOf(view.toJSON()))
    expect(style.backgroundColor).toBe(tokens['color-background'])
    expect(style.boxShadow).toContain('inset')
    expect(style.boxShadow).toContain(String(tokens['color-danger-surface']))
    expect(styleOf(screen.getByText('5')).color).toBe(tokens['color-foreground'])
  })

  test('subtle draws a tint of the fill', async () => {
    const view = await render(on({ emphasis: 'subtle', tone: 'info', value: 5 }))
    const fill = styleOf(markOf(view.toJSON())).backgroundColor
    expect(fill).not.toBe(tokens['color-info-surface'])
    expect(fill).not.toBe(tokens['color-background'])
    expect(styleOf(screen.getByText('5')).color).toBe(tokens['color-foreground'])
  })
})

describe('the placement', () => {
  test('pins the mark to the other corners, mirrored on the axis that moved', async () => {
    const size = Number(tokens['size-badge'] ?? 16)
    const start = await render(on({ placement: 'top-start', value: 3 }))
    expect(styleOf(markOf(start.toJSON()))).toMatchObject({ start: size / 4, top: size / 4 })
    expect(moved(markOf(start.toJSON()))).toMatchObject({ translateX: '-50%', translateY: '-50%' })
    const bottom = await render(on({ placement: 'bottom-end', value: 3 }))
    expect(styleOf(markOf(bottom.toJSON()))).toMatchObject({ bottom: size / 4, end: size / 4 })
    expect(moved(markOf(bottom.toJSON()))).toMatchObject({ translateX: '50%', translateY: '50%' })
  })

  test('inline puts the mark in the line after what it counts, with no ring', async () => {
    const view = await render(on({ placement: 'inline', value: 8 }))
    const style = styleOf(markOf(view.toJSON()))
    expect(style.position).toBe('static')
    expect(style.boxShadow).toBeUndefined()
  })
})

describe('attention', () => {
  test('pulse swells the mark in a loop, on the easing token', async () => {
    const view = await render(on({ attention: 'pulse', value: 4 }))
    expect(styleOf(markOf(view.toJSON()))).toMatchObject({
      animationDuration: 1500,
      animationIterationCount: 'infinite',
    })
    expect(JSON.stringify(styleOf(markOf(view.toJSON())).animationName)).toContain('1.18')
  })

  test('bounce hops the mark by a share of its own height', async () => {
    const view = await render(on({ attention: 'bounce', value: 4 }))
    const style = styleOf(markOf(view.toJSON()))
    expect(style.animationDuration).toBe(1000)
    expect(JSON.stringify(style.animationName)).toContain('-30%')
  })

  test('stops for a reader who asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const view = await render(on({ attention: 'pulse', value: 4 }))
    expect(styleOf(markOf(view.toJSON()))).not.toHaveProperty('animationName')
  })

  test('stops while the app pauses its motion, and starts again', async () => {
    const view = await render(on({ attention: 'bounce', value: 4 }))
    expect(styleOf(markOf(view.toJSON()))).toHaveProperty('animationName')
    await act(() => pauseMotion(true))
    expect(styleOf(markOf(view.toJSON()))).not.toHaveProperty('animationName')
    await act(() => pauseMotion(false))
    expect(styleOf(markOf(view.toJSON()))).toHaveProperty('animationName')
  })

  test('a mark going away draws none', async () => {
    const view = await render(on({ attention: 'pulse', value: 0 }))
    expect(styleOf(markOf(view.toJSON()))).not.toHaveProperty('animationName')
  })
})

describe('large text', () => {
  /* Above 1.353 the mark's height is the least it can be, so it grows
     taller round a count that does not fit, as a control does. */
  test('the count grows fully, and the mark and the dot stop at 1.353 times', async () => {
    const view = await render(on({ value: 8 }))
    const height = Number(tokens['size-badge'])
    const words = Number(tokens['text-xs'])
    const dot = Number(tokens['space-xs'])
    await act(() => atTextSize(3.571))
    expect(styleOf(markOf(view.toJSON())).minHeight).toBeCloseTo(height * 1.353, 1)
    expect(styleOf(screen.getByText('8')).fontSize).toBeCloseTo(words * 3.571, 1)
    const empty = await render(on({}))
    expect(styleOf(markOf(empty.toJSON())).minHeight).toBeCloseTo(dot * 1.353, 1)
  })
})
