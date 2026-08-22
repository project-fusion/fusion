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
    /* `surface` and not `background`: the page takes no cast at all now, being
       the one surface with nothing behind it to sit against, so it is the wrong
       token to ask about a tint that could not be rendered. */
    const theme = deriveTheme({ brand: BRAND, neutral: { chroma: 0.02 } })
    const surface = theme.tokens.find((t) => t.name === 'color-surface')
    if (!surface) {
      throw new Error('theme is missing a surface token')
    }
    expect(surface.chromaReduced).toBe(true)
    expect(isOutOfGamut(surface.value)).toBe(false)
  })

  test('the neutral default is a dead grey, agreeing with the stylesheet', () => {
    const theme = deriveTheme({ brand: BRAND })
    expect(theme.tokens.find((t) => t.name === 'color-surface')?.value.chroma).toBe(0)
  })

  /* The page is the one fixed point either mode has, and `tokens.css` says so:
     `#ffffff` and `#000000`, with the ladder moving around it. The engine had
     0.985 and 0.15, and in light it had the page and the surface the wrong way
     round, so a themed page came out faintly grey carrying white cards. */
  test('the page is pure white and pure black, as the stylesheet paints it', () => {
    const page = (scheme: 'dark' | 'light') =>
      deriveTheme({ brand: BRAND, scheme }).tokens.find((t) => t.name === 'color-background')?.hex

    expect(page('light')).toBe('#ffffff')
    expect(page('dark')).toBe('#000000')
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

describe('the brand as a mark', () => {
  /* The point of the token: everywhere else the brand is solved for a word, and
     a reader who picks a colour should be able to find it somewhere. */
  test('a brand that is already legible is kept exactly', () => {
    for (const brand of ['#3b82f6', '#c1272d']) {
      const theme = deriveTheme({ brand })
      const mark = theme.tokens.find((t) => t.name === 'color-brand-mark')
      expect(mark?.value.lightness, brand).toBeCloseTo(hexToOklch(brand).lightness, 3)
    }
  })

  /* And it moves when it must: a bright yellow cannot clear 3:1 on a white page
     at its own lightness, whatever anybody would prefer. */
  test('a brand that cannot be seen is moved until it can', () => {
    const theme = deriveTheme({ brand: '#ffe100' })
    const mark = theme.tokens.find((t) => t.name === 'color-brand-mark')
    expect(mark?.value.lightness).toBeLessThan(hexToOklch('#ffe100').lightness)
  })

  /* Nearest rather than most legible, which is the correction measurement
     forced: solving it the way every other ink is solved sent `#c1272d`'s mark
     0.133 away when `primary` had landed 0.025 away, so the mark travelled
     further than the text it exists to stay closer than. */
  test('it lands no further from the brand than primary does', () => {
    for (const brand of ['#3b82f6', '#c1272d', '#16a34a', '#ffe100']) {
      const theme = deriveTheme({ brand })
      const asked = hexToOklch(brand).lightness
      const away = (name: string) =>
        Math.abs((theme.tokens.find((t) => t.name === name)?.value.lightness ?? 0) - asked)

      expect(away('color-brand-mark'), brand).toBeLessThanOrEqual(away('color-primary') + 0.001)
    }
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

  /* **`fill` and `space` used to do nothing at all**, both emitting a zero edge
     and no lift, which made them identical to each other and to nobody's
     benefit. What separates a surface when it is neither an edge nor a lift is
     how far its own colour sits from the page, so the policy scales that. */
  test('fill pushes the surface ladder away from the page', () => {
    const ground = (surface: 'border' | 'fill') =>
      deriveTheme({ brand: BRAND, separation: { surface } }).tokens.find(
        (t) => t.name === 'color-surface-sunken',
      )?.value.lightness ?? 0

    expect(ground('fill')).toBeLessThan(ground('border'))
  })

  test('space collapses it, so only the gap tells them apart', () => {
    const theme = deriveTheme({ brand: BRAND, separation: { surface: 'space' } })
    const at = (name: string) => theme.tokens.find((t) => t.name === name)?.hex

    expect(at('color-surface')).toBe(at('color-background'))
    expect(at('color-surface-raised')).toBe(at('color-background'))
    expect(at('color-surface-sunken')).toBe(at('color-background'))
  })

  /* Collapsing the ladder could have broken every ink solved against it, since
     the foregrounds are solved against whatever the surfaces became. */
  test('every mechanism still derives with nothing failing', () => {
    for (const surface of ['border', 'fill', 'shadow', 'space'] as const) {
      expect(deriveTheme({ brand: BRAND, separation: { surface } }).violations, surface).toEqual([])
    }
  })

  /* The ramp has two regimes and one ratio across both would crush the top or
     blow out the bottom: below the body size a label has to be smaller than its
     field and still be read, which is a floor rather than a ratio. */
  test('the ramp steps down by a pixel and up by the ratio', () => {
    const css = toCss(deriveTheme({ brand: BRAND, font: { base: 14, scale: 1.32 } }))
    const px = (name: string) =>
      Number(css.match(new RegExp(`--helix-text-${name}: ([0-9.]+)rem`))?.[1] ?? 0) * 16

    expect([px('xs'), px('sm'), px('md')]).toEqual([12, 13, 14])
    expect([px('lg'), px('xl'), px('2xl'), px('3xl')]).toEqual([18, 24, 32, 42])
  })

  test('the floor holds a small base off the bottom', () => {
    const css = toCss(deriveTheme({ brand: BRAND, font: { base: 12 } }))
    const px = (name: string) =>
      Number(css.match(new RegExp(`--helix-text-${name}: ([0-9.]+)rem`))?.[1] ?? 0) * 16

    expect(px('xs')).toBe(11)
    expect(px('sm')).toBe(11)
  })

  test('a weight character moves all three together', () => {
    const css = toCss(deriveTheme({ brand: BRAND, font: { weight: 'strong' } }))
    expect(css).toContain('--helix-weight-regular: 500;')
    expect(css).toContain('--helix-weight-medium: 600;')
    expect(css).toContain('--helix-weight-semibold: 700;')
  })

  /* The shipped ramp is hand-picked, so a theme that says nothing about size
     keeps it rather than getting a generated run that rounds differently. */
  test('saying nothing about size emits no ramp', () => {
    const css = toCss(deriveTheme({ brand: BRAND }))
    expect(css).not.toContain('--helix-text-')
    expect(css).not.toContain('--helix-weight-')
  })

  test('a single face fills the display slot too', () => {
    const css = toCss(deriveTheme({ brand: BRAND, font: { body: 'Inter, sans-serif' } }))
    expect(css).toContain('--helix-font-sans: Inter, sans-serif;')
    expect(css).toContain('--helix-font-display: Inter, sans-serif;')
  })

  test('a display face is kept where one is given', () => {
    const css = toCss(
      deriveTheme({
        brand: BRAND,
        font: { body: 'Inter, sans-serif', display: 'Fraunces, serif' },
      }),
    )
    expect(css).toContain('--helix-font-display: Fraunces, serif;')
  })

  /* Emitting a repeat of the stylesheet's own stack would be a theme claiming
     a decision nobody made. */
  test('an omitted face emits nothing at all', () => {
    expect(toCss(deriveTheme({ brand: BRAND }))).not.toContain('--helix-font-')
  })

  test('a character sets the pace and the curve together', () => {
    const snappy = toCss(deriveTheme({ brand: BRAND, motion: { character: 'snappy' } }))
    const gentle = toCss(deriveTheme({ brand: BRAND, motion: { character: 'gentle' } }))

    expect(snappy).toContain('--helix-duration-fast: 84ms;')
    expect(gentle).toContain('--helix-duration-fast: 162ms;')
    expect(snappy).toContain('--helix-easing-standard: cubic-bezier(0.3, 0, 0.1, 1);')
  })

  /* A real overshoot needs more than two control points, so `springy` takes the
     `linear()` curve the stylesheet already ships rather than a bezier
     pretending to be one. */
  test('springy takes the easing the stylesheet already has', () => {
    expect(toCss(deriveTheme({ brand: BRAND, motion: { character: 'springy' } }))).toContain(
      '--helix-easing-standard: var(--helix-easing-spring);',
    )
  })

  test('a scale multiplies on top of the character', () => {
    const css = toCss(deriveTheme({ brand: BRAND, motion: { character: 'snappy', scale: 2 } }))
    expect(css).toContain('--helix-duration-fast: 168ms;')
  })

  test('saying nothing about motion emits nothing', () => {
    const css = toCss(deriveTheme({ brand: BRAND }))
    expect(css).not.toContain('--helix-duration-')
    expect(css).not.toContain('--helix-easing-')
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
