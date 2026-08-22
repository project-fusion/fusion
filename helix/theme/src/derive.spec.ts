import { describe, expect, test } from 'bun:test'
import { defaultPairings, deriveTheme, toCss } from './derive.js'
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
    /* A near-white surface carrying a brand tint cannot be rendered as
       authored. The cast has to be asked for now: the neutral default moved to
       chroma 0 to agree with `primitives.css`, which had already rejected the
       0.008 this engine was hardcoding because a fixed chroma is a rising
       saturation as a surface darkens and it read navy across a dark page. So
       this test used to pass on a default nobody chose. */
    const theme = deriveTheme({ brand: BRAND, neutral: { chroma: 0.02 } })
    const background = theme.tokens.find((t) => t.name === 'color-background')
    if (!background) {
      throw new Error('theme is missing a background token')
    }
    expect(background.chromaReduced).toBe(true)
    expect(isOutOfGamut(background.value)).toBe(false)
  })

  test('the neutral default is a dead grey, agreeing with the stylesheet', () => {
    const theme = deriveTheme({ brand: BRAND })
    const background = theme.tokens.find((t) => t.name === 'color-background')
    expect(background?.value.chroma).toBe(0)
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

describe('the chroma policy', () => {
  test('a ceiling of zero makes every derived colour grey', () => {
    const theme = deriveTheme({ brand: BRAND, chroma: { ceiling: 0 } })
    const derived = theme.tokens.filter((t) => t.origin !== 'pinned')
    expect(derived.every((t) => t.value.chroma === 0)).toBe(true)
  })

  test('it scales what the brand supplies without moving its hue', () => {
    const full = deriveTheme({ brand: BRAND })
    const half = deriveTheme({ brand: BRAND, chroma: { scale: 0.5 } })
    const primary = (theme: ReturnType<typeof deriveTheme>) =>
      theme.tokens.find((t) => t.name === 'color-primary')
    expect(primary(half)?.value.chroma).toBeLessThan(primary(full)?.value.chroma ?? 0)
    expect(primary(half)?.value.hue).toBeCloseTo(primary(full)?.value.hue ?? 0, 5)
  })

  /* The whole point of the policy: a restrained theme whose status colours are
     literals is a restrained theme with one vivid red in it, which reads as a
     bug rather than as a warning. */
  test('status follows the palette rather than staying a literal', () => {
    const muted = deriveTheme({ brand: BRAND, chroma: { ceiling: 0.02 } })
    const danger = muted.tokens.find((t) => t.name === 'color-danger')
    expect(danger?.value.chroma).toBeLessThanOrEqual(0.02)
  })

  test('a pinned value keeps its chroma, the policy being about what we derive', () => {
    const theme = deriveTheme({
      brand: BRAND,
      chroma: { ceiling: 0 },
      tokens: { 'color-primary': '#c1272d' },
    })
    const primary = theme.tokens.find((t) => t.name === 'color-primary')
    expect(primary?.origin).toBe('pinned')
    expect(primary?.value.chroma).toBeGreaterThan(0)
  })
})

describe('the accent', () => {
  test('a relation holds its angle exactly when told not to yield', () => {
    const theme = deriveTheme({
      accent: { allowance: 0, from: 'brand', rotate: 180 },
      brand: BRAND,
    })
    const accent = theme.tokens.find((t) => t.name === 'color-accent')
    expect(accent?.origin).toBe('related')
    expect(accent?.value.hue).toBeCloseTo((BRAND.hue + 180) % 360, 0)
  })

  /* **The accent is the only role with nothing to lose.** A status hue carries
     meaning and a brand is a fact the consumer supplied, so when two of them
     collide the accent is what moves. On the shipped blue the complement lands
     at 80 and `warning` is amber at 75, and no rotation of `warning` inside any
     sane allowance clears it: `danger` at 27 and `success` at 155 box in every
     hue it could reach. */
  test('it yields to a status rather than the status yielding to it', () => {
    const held = deriveTheme({ accent: { allowance: 0, from: 'brand', rotate: 180 }, brand: BRAND })
    const free = deriveTheme({ brand: BRAND })
    const warning = (theme: ReturnType<typeof deriveTheme>): number | undefined =>
      theme.tokens.find((t) => t.name === 'color-warning')?.value.hue

    expect(held.collisions.some((c) => c.includes('accent') && c.includes('warning'))).toBe(true)
    expect(free.collisions.some((c) => c.includes('accent'))).toBe(false)
    expect(warning(free)).toBeCloseTo(warning(held) ?? 0, 0)
  })

  test('a colour pins it and the rotation stands aside', () => {
    const theme = deriveTheme({ accent: '#ff6f3c', brand: BRAND })
    expect(theme.tokens.find((t) => t.name === 'color-accent')?.origin).toBe('pinned')
  })

  test('rethemeing the brand carries a related accent with it', () => {
    /* Held exactly, or each brand's accent yields by a different amount to a
       different neighbour and the angle between them stops being the thing
       under test. */
    const hold = { allowance: 0, from: 'brand' as const, rotate: 180 }
    const one = deriveTheme({ accent: hold, brand: BRAND })
    const two = deriveTheme({ accent: hold, brand: { chroma: 0.19, hue: 20, lightness: 0.58 } })
    const gap = (theme: ReturnType<typeof deriveTheme>): number => {
      const primary = theme.tokens.find((t) => t.name === 'color-primary')?.value.hue ?? 0
      const accent = theme.tokens.find((t) => t.name === 'color-accent')?.value.hue ?? 0
      return (accent - primary + 720) % 360
    }
    expect(gap(one)).toBeCloseTo(gap(two), 0)
  })
})

describe('pairings and collisions', () => {
  test('every pair the model declares is measured, in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = deriveTheme({ brand: BRAND, scheme })
      /* Derived from the model rather than counted by hand, or this asserts a
         number somebody has to remember to update and stops asserting that the
         model is what was checked. */
      expect(theme.pairings, scheme).toHaveLength(defaultPairings(4.5).length)
      expect(theme.violations, scheme).toEqual([])
    }
  })

  /* The pairs the ten hand-written ones never mentioned. Each is a ground a
     component really paints and nothing had ever measured an ink against. */
  test('the pairs the old list missed are in the set', () => {
    const theme = deriveTheme({ brand: BRAND })
    const has = (foreground: string, background: string): boolean =>
      theme.pairings.some((p) => p.foreground === foreground && p.background === background)

    expect(has('color-foreground', 'color-primary-subtle')).toBe(true)
    expect(has('color-foreground-on-accent', 'color-primary-surface-hover')).toBe(true)
    expect(has('color-foreground-on-accent', 'color-danger-surface')).toBe(true)
    expect(has('color-focus-ring', 'color-surface-raised')).toBe(true)
    expect(has('color-foreground-inverse', 'color-surface-inverse')).toBe(true)
  })

  test('a ring is held to 3:1 and text to the theme target', () => {
    const theme = deriveTheme({ brand: BRAND, contrastTarget: 7 })
    const ring = theme.pairings.find((p) => p.foreground === 'color-focus-ring')
    const text = theme.pairings.find((p) => p.foreground === 'color-foreground')
    expect(ring?.target).toBe(3)
    expect(text?.target).toBe(7)
  })

  /* The second producer of `unverifiable`, and the principled one: a caption
     over a photograph has the photograph behind it and no derivation knows
     what that is. */
  test('an unbounded ground is unverifiable however the theme is built', () => {
    const theme = deriveTheme({ brand: BRAND })
    const media = theme.pairings.find((p) => p.background === 'color-surface-media')
    expect(media?.status).toBe('unverifiable')
    expect(media?.ratio).toBeUndefined()
  })

  /* The property this output exists for. A pair nobody could measure has to be
     distinguishable from one that was measured and passed, or the guarantee
     quietly becomes a claim about the pairs that happened to be easy. */
  test('a pair naming a token the theme does not emit is unverifiable, not dropped', () => {
    const theme = deriveTheme({
      brand: BRAND,
      pairings: [{ background: 'color-glass-header', foreground: 'color-foreground' }],
    })
    expect(theme.pairings).toHaveLength(1)
    expect(theme.pairings[0]?.status).toBe('unverifiable')
    expect(theme.pairings[0]?.ratio).toBeUndefined()
    expect(theme.violations).toEqual([])
  })

  test('violations render the failures and nothing else', () => {
    const theme = deriveTheme({ brand: BRAND, tokens: { 'color-foreground': '#f8f8f8' } })
    expect(theme.violations.length).toBeGreaterThan(0)
    expect(theme.violations.length).toBe(theme.pairings.filter((p) => p.status === 'fail').length)
  })

  /* A brand that *is* red is the case the allowance exists for: a red brand
     beside a red danger carries no information at all. */
  test('a status held at its convention collides with a brand of the same hue', () => {
    const theme = deriveTheme({
      brand: { chroma: 0.21, hue: 27, lightness: 0.57 },
      status: { allowance: 0 },
    })
    expect(theme.collisions.some((c) => c.includes('danger'))).toBe(true)
  })

  test('and the default allowance repairs it without being asked', () => {
    const repaired = deriveTheme({ brand: { chroma: 0.21, hue: 27, lightness: 0.57 } })
    expect(repaired.collisions.some((c) => c.includes('danger'))).toBe(false)
  })

  /* The reason the default is 20 rather than 0: a palette that ships reporting
     a collision it has the means to fix is a palette nobody trusts the report
     of. */
  test('the shipped brand derives with nothing left to report', () => {
    expect(deriveTheme({ brand: BRAND }).collisions).toEqual([])
  })
})

describe('the separation policy', () => {
  test('an omitted policy emits nothing, leaving the stylesheet standing', () => {
    const css = toCss(deriveTheme({ brand: BRAND }))
    expect(css).not.toContain('--helix-border-surface')
    expect(css).not.toContain('--helix-shadow-floating')
  })

  /* The reason there are two policies: a theme can flatten what sits in the
     flow while leaving a menu legible over content nobody can predict. */
  test('the two halves move independently', () => {
    const css = toCss(
      deriveTheme({ brand: BRAND, separation: { floating: 'shadow', surface: 'border' } }),
    )
    expect(css).toContain('--helix-border-surface: 1px;')
    expect(css).toContain('--helix-shadow-surface: none;')
    expect(css).toContain('--helix-border-floating: 0;')
    expect(css).toMatch(/--helix-shadow-floating: 0 12px/)
  })

  test('shadow-first in flow clears the edge and lights the lift', () => {
    const css = toCss(deriveTheme({ brand: BRAND, separation: { surface: 'shadow' } }))
    expect(css).toContain('--helix-border-surface: 0;')
    expect(css).toMatch(/--helix-shadow-surface: 0 4px/)
  })

  test('material is a policy and zero blur means flat', () => {
    expect(toCss(deriveTheme({ brand: BRAND, material: { blur: 0 } }))).toContain(
      '--helix-material-backdrop: none;',
    )
    expect(toCss(deriveTheme({ brand: BRAND, material: { blur: 24 } }))).toContain(
      '--helix-material-backdrop: blur(24px);',
    )
  })
})

describe('the namespace', () => {
  test('it renames every token and every seed', () => {
    const css = toCss(deriveTheme({ brand: BRAND, namespace: 'acme' }))
    expect(css).toContain('--acme-color-primary: #')
    expect(css).toContain('--acme-seed-brand: #')
    expect(css).not.toContain('--helix-')
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
