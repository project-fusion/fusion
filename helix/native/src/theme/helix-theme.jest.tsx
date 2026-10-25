import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { Dimensions } from 'react-native'
import { dark } from './dark.generated'
import {
  atRoot,
  drawnTokens,
  familyOn,
  ROOT,
  SPACE_SCALE_LIMIT,
  scaledTokens,
  setsType,
  type Tokens,
} from './drawn'
import { HelixTheme, useFontScale, useTokens } from './helix-theme'
import { kinds } from './kinds.generated'
import { light } from './light.generated'
import { useTheme } from './theme'

/** What a probe inside a theme read: the renderer's tokens and rems, and an app's tokens and text size. */
interface Read {
  drawn?: Tokens
  fontScale?: number
  rem?: number
  spaceRem?: number
  values?: Tokens
}

/** Reads the theme it is drawn in into `read`. */
const Probe = ({ read }: { readonly read: Read }) => {
  const theme = useTheme()
  read.drawn = theme.tokens
  read.rem = theme.rem
  read.spaceRem = theme.spaceRem
  read.values = useTokens()
  read.fontScale = useFontScale()
  return null
}

/* The system's color scheme is dark, so a theme with no mode draws dark. */
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'dark',
}))

/**
 * Sets the reader's text size, as iOS and Android report a change to it:
 * React Native's `Dimensions` hears new metrics and tells each listener.
 */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
})

/* The default size; 1.353, the largest of iOS's standard sizes; 2, the largest
   Android 14 offers; and 3.571, the largest of iOS's accessibility sizes. */
const SIZES = [1, 1.353, 2, 3.571] as const

/** Points rounded to hundredths, as the theme and the renderer round them. */
const points = (value: number): number => Math.round(value * 100) / 100

describe('atRoot', () => {
  test('gives a length in rems as points at the root size, and leaves points as they are', () => {
    expect(atRoot('0.875rem', ROOT)).toBe(14)
    expect(atRoot('0.875rem', ROOT * 3.571)).toBe(49.99)
    expect(atRoot(1, ROOT * 3.571)).toBe(1)
    expect(atRoot('2px', ROOT * 3.571)).toBe(2)
    expect(atRoot('calc(1rem - 2px)', ROOT * 2)).toBe(30)
    expect(atRoot('calc(0.5em + 1rem + -4px)', ROOT * 2)).toBe('calc(0.5em + 28px)')
  })

  test('leaves ems for the font size where the length lands, and passes what is no length', () => {
    expect(atRoot('-0.01em', ROOT * 2)).toBe('-0.01em')
    expect(atRoot(light['leading-heading'], ROOT)).toBe('calc(0.99em + 8px)')
    expect(atRoot('auto', ROOT * 2)).toBe('auto')
    expect(atRoot('#ff0000', ROOT * 2)).toBe('#ff0000')
  })
})

describe('setsType', () => {
  test('is true of a text size, a line height, and a letter spacing, by category', () => {
    expect(['text-md', 'text-control', 'leading-heading', 'tracking-wide'].map(setsType)).toEqual([
      true,
      true,
      true,
      true,
    ])
    expect(['space-md', 'size-icon', 'radii-sm', 'border-thin'].map(setsType)).toEqual([
      false,
      false,
      false,
      false,
    ])
  })
})

describe('scaledTokens', () => {
  test('scales a length written in rems, and leaves a length in points, a multiple, and a color', () => {
    const scaled = scaledTokens(light, kinds, 1.25)
    expect(scaled['text-md']).toBe(17.5)
    expect(scaled['space-md']).toBe(20)
    expect(scaled['border-thin']).toBe(1)
    expect(scaled['radii-full']).toBe(9999)
    expect(scaled['leading-normal']).toBe(1.5)
    expect(scaled['color-background']).toBe(light['color-background'])
  })

  test('grows type with the whole text size, and stops every other length at the limit', () => {
    const scaled = scaledTokens(light, kinds, 3.571)
    expect(scaled['text-md']).toBe(49.99)
    expect(scaled['leading-heading']).toBe('calc(0.99em + 28.57px)')
    expect(scaled['space-md']).toBe(points(16 * SPACE_SCALE_LIMIT))
    expect(scaled['size-icon']).toBe(points(20 * SPACE_SCALE_LIMIT))
    expect(scaled['size-control']).toBe(points(40 * SPACE_SCALE_LIMIT))
  })

  test('reads a token an app added as a length where its value is one, by its category', () => {
    const scaled = scaledTokens(
      { 'brand-name': 'Acme', 'size-brand': '2rem', 'size-rule': 3, 'text-brand': '2rem' },
      kinds,
      2,
    )
    expect(scaled).toEqual({
      'brand-name': 'Acme',
      'size-brand': points(32 * SPACE_SCALE_LIMIT),
      'size-rule': 3,
      'text-brand': 64,
    })
  })
})

describe('drawnTokens', () => {
  test('gives the renderer a length in points as px, keeps rems for it to resolve, and a time as ms', () => {
    const drawn = drawnTokens(light, kinds, 'ios')
    expect(drawn['size-control-md']).toBe('2.5rem')
    expect(drawn['border-thin']).toBe('1px')
    expect(drawn['duration-fast']).toBe('120ms')
    expect(drawn['leading-normal']).toBe(1.5)
    expect(drawn['tracking-wide']).toBe('0.02em')
    expect(drawn['color-background']).toBe(light['color-background'])
    expect(drawn['easing-standard']).toBe('cubic-bezier(0.2, 0, 0, 1)')
  })

  test('passes a token an app added, which has no kind, as it is', () => {
    expect(drawnTokens({ 'size-brand': 12 }, kinds, 'ios')['size-brand']).toBe(12)
  })
})

describe('familyOn', () => {
  test("names the system's fonts as each platform does, and keeps a family an app loads", () => {
    expect(familyOn(light['font-sans'], 'ios')).toBe('System')
    expect(familyOn(light['font-sans'], 'android')).toBe('sans-serif')
    expect(familyOn(light['font-mono'], 'ios')).toBe('Menlo')
    expect(familyOn(light['font-mono'], 'android')).toBe('monospace')
    expect(familyOn('"Inter", sans-serif', 'ios')).toBe('Inter')
  })
})

describe('HelixTheme', () => {
  test("follows the system's color scheme where no mode is given", async () => {
    const read: Read = {}
    await render(
      <HelixTheme>
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values).toEqual(scaledTokens(dark, kinds, 1))
    expect(read.drawn?.['color-background']).toBe(dark['color-background'])
  })

  test('draws a subtree in its own mode, and keeps what it does not change', async () => {
    const outer: Read = {}
    const inner: Read = {}
    await render(
      <HelixTheme mode="light" tokens={{ dark: { 'color-primary': '#ff0000' } }}>
        <Probe read={outer} />
        <HelixTheme mode="dark">
          <Probe read={inner} />
        </HelixTheme>
      </HelixTheme>,
    )
    expect(outer.values?.['color-background']).toBe(light['color-background'])
    expect(inner.values?.['color-background']).toBe(dark['color-background'])
    expect(inner.values?.['color-primary']).toBe('#ff0000')
  })

  test("lays an app's values over the shipped ones, and gives its own styles the numbers", async () => {
    const read: Read = {}
    await render(
      <HelixTheme mode="light" tokens={{ light: { 'size-control-md': 44 } }}>
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values?.['size-control-md']).toBe(44)
    expect(read.drawn?.['size-control-md']).toBe('44px')
  })

  test("outside a theme, an app's styles read Helix's light values at the default text size", async () => {
    const read: Read = {}
    await render(<Probe read={read} />)
    expect(read.values).toEqual(scaledTokens(light, kinds, 1))
    expect(read.values?.['text-md']).toBe(14)
    expect(read.fontScale).toBe(1)
    expect(read.rem).toBe(ROOT)
  })
})

describe('HelixTheme at the reader’s text size', () => {
  test.each(SIZES)(
    'at %p, text grows by the text size, space stops at the limit, and points stay',
    async (size) => {
      atTextSize(size)
      const read: Read = {}
      await render(
        <HelixTheme mode="light">
          <Probe read={read} />
        </HelixTheme>,
      )
      const space = Math.min(size, SPACE_SCALE_LIMIT)
      expect(read.fontScale).toBe(size)
      expect(read.rem).toBe(ROOT * size)
      expect(read.spaceRem).toBe(ROOT * space)
      expect(read.values?.['text-md']).toBe(points(14 * size))
      expect(read.values?.['space-md']).toBe(points(16 * space))
      expect(read.values?.['size-control']).toBe(points(40 * space))
      expect(read.values?.['size-icon']).toBe(points(20 * space))
      expect(read.values?.['radii-sm']).toBe(points(4 * space))
      expect(read.values?.['border-thin']).toBe(1)
      expect(read.values?.['size-focus-offset']).toBe(2)
      expect(read.values?.['leading-normal']).toBe(1.5)
      expect(read.values?.['tracking-wide']).toBe('0.02em')
      expect(read.drawn?.['text-md']).toBe('0.875rem')
      expect(read.drawn?.['border-thin']).toBe('1px')
    },
  )

  test("an app's length grows where it is written in rems, and stays where it is written in points", async () => {
    atTextSize(3.571)
    const read: Read = {}
    await render(
      <HelixTheme
        mode="light"
        tokens={{
          light: { 'size-avatar': 44, 'size-control-md': '2.75rem', 'text-hero': '2rem' },
        }}
      >
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values?.['size-control-md']).toBe(points(44 * SPACE_SCALE_LIMIT))
    expect(read.values?.['text-hero']).toBe(points(32 * 3.571))
    expect(read.values?.['size-avatar']).toBe(44)
  })

  test('draws again at a new text size when the reader changes the setting', async () => {
    const outer: Read = {}
    const inner: Read = {}
    await render(
      <HelixTheme mode="light">
        <Probe read={outer} />
        <HelixTheme mode="dark">
          <Probe read={inner} />
        </HelixTheme>
      </HelixTheme>,
    )
    expect(outer.values?.['text-md']).toBe(14)
    await act(() => atTextSize(3.571))
    expect(outer.fontScale).toBe(3.571)
    expect(outer.values?.['text-md']).toBe(49.99)
    expect(outer.values?.['space-md']).toBe(21.65)
    expect(outer.spaceRem).toBe(ROOT * SPACE_SCALE_LIMIT)
    expect(inner.values?.['text-md']).toBe(49.99)
    await act(() => atTextSize(1))
    expect(outer.values?.['text-md']).toBe(14)
  })
})
