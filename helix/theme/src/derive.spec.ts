import { describe, expect, test } from 'bun:test'
import { deriveTheme, toCss } from './derive.js'
import {
  contrastRatio,
  hexToOklch,
  isOutOfGamut,
  lightnessForContrast,
  type Oklch,
  oklchToHex,
} from './oklch.js'

const BRAND: Oklch = { chroma: 0.19, hue: 258, lightness: 0.58 }

describe('contrast math', () => {
  test('white on black is the maximum ratio', () => {
    const white: Oklch = { chroma: 0, hue: 0, lightness: 1 }
    const black: Oklch = { chroma: 0, hue: 0, lightness: 0 }
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0)
  })

  test('a color has no contrast with itself', () => {
    expect(contrastRatio(BRAND, BRAND)).toBeCloseTo(1, 5)
  })

  test('ratio is symmetric', () => {
    const bg: Oklch = { chroma: 0, hue: 0, lightness: 0.98 }
    expect(contrastRatio(BRAND, bg)).toBeCloseTo(contrastRatio(bg, BRAND), 10)
  })
})

describe('lightnessForContrast', () => {
  const light: Oklch = { chroma: 0, hue: 0, lightness: 0.985 }
  const dark: Oklch = { chroma: 0, hue: 0, lightness: 0.15 }

  test('solves for AA against a light background', () => {
    const solved = lightnessForContrast({ chroma: 0.19, hue: 258 }, light, 4.5)
    expect(contrastRatio(solved, light)).toBeGreaterThanOrEqual(4.5)
  })

  test('solves for AA against a dark background', () => {
    const solved = lightnessForContrast({ chroma: 0.19, hue: 258 }, dark, 4.5)
    expect(contrastRatio(solved, dark)).toBeGreaterThanOrEqual(4.5)
  })

  test('solves for AAA when asked', () => {
    const solved = lightnessForContrast({ chroma: 0, hue: 0 }, light, 7)
    expect(contrastRatio(solved, light)).toBeGreaterThanOrEqual(7)
  })

  test('returns the least extreme lightness that still passes', () => {
    const solved = lightnessForContrast({ chroma: 0, hue: 0 }, light, 4.5)
    const ratio = contrastRatio(solved, light)
    // Comfortably passing but not maxed out: proves it is solving, not clamping.
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(ratio).toBeLessThan(9)
  })

  test('preserves hue and chroma, moving only lightness', () => {
    const solved = lightnessForContrast({ chroma: 0.19, hue: 258 }, light, 4.5)
    expect(solved.hue).toBe(258)
    expect(solved.chroma).toBe(0.19)
  })
})

describe('deriveTheme', () => {
  test('light theme passes its contrast target with no violations', () => {
    const theme = deriveTheme({ brand: BRAND })
    expect(theme.violations).toEqual([])
  })

  test('dark theme passes its contrast target with no violations', () => {
    const theme = deriveTheme({ brand: BRAND, scheme: 'dark' })
    expect(theme.violations).toEqual([])
  })

  test('holds at an AAA target', () => {
    const theme = deriveTheme({ brand: BRAND, contrastTarget: 7 })
    expect(theme.violations).toEqual([])
  })

  test('every foreground token meets the target against its pairing', () => {
    const target = 4.5
    const theme = deriveTheme({ brand: BRAND, contrastTarget: target })
    const paired = theme.tokens.filter(
      (t) => t.contrast !== undefined && t.name.includes('foreground'),
    )

    expect(paired.length).toBeGreaterThan(0)
    for (const t of paired) {
      expect(t.contrast).toBeGreaterThanOrEqual(target)
    }
  })

  test('holds across the full hue circle, both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (let hue = 0; hue < 360; hue += 15) {
        const theme = deriveTheme({ brand: { chroma: 0.15, hue, lightness: 0.6 }, scheme })
        expect(theme.violations, `${scheme} hue ${hue}`).toEqual([])
      }
    }
  })

  // Regression: foregrounds were solved against `background` only. In a dark
  // theme `surface` is lighter than `background`, so light text lost contrast
  // inside cards and dialogs while the page itself passed.
  test('text passes on surface, not just on background', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = deriveTheme({ brand: BRAND, scheme })
      const find = (name: string) => theme.tokens.find((t) => t.name === name)?.value
      const surface = find('color-surface')
      const foregroundMuted = find('color-foreground-muted')

      if (!surface || !foregroundMuted) {
        throw new Error(`${scheme} theme is missing surface or foreground tokens`)
      }
      expect(
        contrastRatio(foregroundMuted, surface),
        `${scheme} muted on surface`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('no derived token falls outside the sRGB gamut', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = deriveTheme({ brand: BRAND, scheme })
      const outside = theme.tokens.filter((t) => isOutOfGamut(t.value)).map((t) => t.name)
      expect(outside, `${scheme} scheme`).toEqual([])
    }
  })

  test('gamut mapping is reported rather than applied silently', () => {
    // A near-white surface carrying brand tint cannot be rendered as authored.
    const theme = deriveTheme({ brand: BRAND })
    const background = theme.tokens.find((t) => t.name === 'color-background')
    if (!background) {
      throw new Error('theme is missing a background token')
    }
    expect(background.chromaReduced).toBe(true)
    expect(isOutOfGamut(background.value)).toBe(false)
  })

  // `violations` fails open on non-finite input: every `ratio < target`
  // comparison against NaN is false, so a garbage theme reported no problems
  // and emitted #000000 everywhere.
  describe('rejects input it cannot validate', () => {
    const cases: Array<[string, () => unknown]> = [
      ['NaN chroma', () => deriveTheme({ brand: { chroma: Number.NaN, hue: 0, lightness: 0.5 } })],
      ['NaN hue', () => deriveTheme({ brand: { chroma: 0.1, hue: Number.NaN, lightness: 0.5 } })],
      [
        'Infinity lightness',
        () => deriveTheme({ brand: { ...BRAND, lightness: Number.POSITIVE_INFINITY } }),
      ],
      ['negative chroma', () => deriveTheme({ brand: { chroma: -0.2, hue: 0, lightness: 0.5 } })],
      ['lightness above 1', () => deriveTheme({ brand: { chroma: 0.1, hue: 0, lightness: 1.5 } })],
      ['contrastTarget below 1', () => deriveTheme({ brand: BRAND, contrastTarget: 0 })],
      ['contrastTarget above 21', () => deriveTheme({ brand: BRAND, contrastTarget: 25 })],
      ['zero density', () => deriveTheme({ brand: BRAND, density: 0 })],
      ['negative radius', () => deriveTheme({ brand: BRAND, radius: -1 })],
    ]

    for (const [label, fn] of cases) {
      test(label, () => {
        expect(fn).toThrow()
      })
    }

    test('accepts the boundary values', () => {
      expect(() => deriveTheme({ brand: { chroma: 0, hue: 0, lightness: 0 } })).not.toThrow()
      expect(() => deriveTheme({ brand: { chroma: 0, hue: 360, lightness: 1 } })).not.toThrow()
      expect(() => deriveTheme({ brand: BRAND, contrastTarget: 21 })).not.toThrow()
    })
  })

  test('emits valid CSS custom properties', () => {
    const css = toCss(deriveTheme({ brand: BRAND }))
    expect(css).toStartWith(':root {')
    expect(css).toContain('--helix-color-primary: #')
    /* Both non-colour seeds, under the exact public names `primitives.css`
       falls back through. Asserting one of them is what let `radius` sit
       against a stylesheet reading `radii` for as long as it did, and neither
       name reached anything: a spec can only hold a name it names. */
    expect(css).toContain('--helix-seed-density: 1')
    expect(css).toContain('--helix-seed-radii: 0.5rem')
  })
})

describe('gamut detection', () => {
  test('flags a chroma no display can render', () => {
    expect(isOutOfGamut({ chroma: 0.4, hue: 258, lightness: 0.6 })).toBe(true)
  })

  test('accepts an ordinary color', () => {
    expect(isOutOfGamut({ chroma: 0.05, hue: 258, lightness: 0.6 })).toBe(false)
  })
})

describe('hexToOklch', () => {
  test('a hex a reader picked survives the trip out and back', () => {
    /* The property that matters for a colour picker, and the one that holds
       exactly: hex in, hex out. OKLCH is not the fixed point because
       `oklchToHex` clips, so an out of gamut colour returns as the one that can
       be rendered rather than the one that was asked for. */
    for (const hex of ['#4b9cff', '#442323', '#48823b', '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  test('and the short form is the long one', () => {
    expect(hexToOklch('#fff')).toEqual(hexToOklch('#ffffff'))
  })

  test('clipping is visible rather than silent', () => {
    /* Chroma 0.19 at lightness 0.7 is outside sRGB. It returns lower on both,
       which is the clip and not an error in the inverse. */
    const wanted = { chroma: 0.19, hue: 258, lightness: 0.7 }
    expect(isOutOfGamut(wanted)).toBe(true)
    expect(hexToOklch(oklchToHex(wanted)).chroma).toBeLessThan(wanted.chroma)
  })
})
