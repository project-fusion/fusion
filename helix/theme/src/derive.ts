import { contrastRatio, fitToGamut, lightnessForContrast, type Oklch, oklchToHex } from './oklch.js'

/**
 * The intent inputs a user supplies. Everything in a theme is computed from
 * these, which is what makes theming a product rather than a config file.
 */
export interface ThemeIntent {
  /** Brand color as OKLCH. The one value most users will actually care about. */
  brand: Oklch
  /** Target contrast for body text. 4.5 is WCAG AA, 7 is AAA. */
  contrastTarget?: number
  /** Scales spacing and control heights. 1 is default, 0.875 is compact. */
  density?: number
  /** Base corner radius in rem. */
  radius?: number
  /** Light or dark surface. */
  scheme?: 'dark' | 'light'
}

/** A derived token, carrying the check that produced it. */
export interface DerivedToken {
  /**
   * True when chroma had to be reduced to bring the color into the sRGB gamut.
   * Informational, not a failure: `value` is always in gamut.
   */
  chromaReduced: boolean
  /** Measured contrast against the pairing surface, where one is meaningful. */
  contrast?: number
  hex: string
  name: string
  /** Always inside the sRGB gamut. */
  value: Oklch
}

export interface DerivedTheme {
  intent: Required<ThemeIntent>
  tokens: DerivedToken[]
  /** Pairings that failed their contrast target. Empty means the theme passes. */
  violations: string[]
}

const DEFAULTS = {
  contrastTarget: 4.5,
  density: 1,
  radius: 0.5,
  scheme: 'light',
} as const

/**
 * Builds a token, fitting the color into the sRGB gamut first so that both the
 * emitted hex and the recorded contrast describe what actually ships.
 */
const token = (name: string, raw: Oklch, against?: Oklch): DerivedToken => {
  const value = fitToGamut(raw)
  return {
    chromaReduced: value.chroma < raw.chroma,
    hex: oklchToHex(value),
    name,
    value,
    ...(against ? { contrast: contrastRatio(value, fitToGamut(against)) } : {}),
  }
}

/**
 * Rejects inputs that would silently produce a theme reporting no violations.
 *
 * `violations` is the only safety mechanism this module has, and it fails
 * *open* on non-finite numbers: every `ratio < target` comparison against NaN
 * is false, so a theme derived from a NaN brand color passes every check and
 * emits `#000000` everywhere. Bad input has to be rejected rather than
 * confidently approved.
 */
const assertUsableIntent = ({
  brand,
  contrastTarget,
  density,
  radius,
}: Required<ThemeIntent>): void => {
  const finite = (label: string, value: number): void => {
    if (!Number.isFinite(value)) {
      throw new TypeError(`deriveTheme: ${label} must be a finite number, received ${value}`)
    }
  }

  finite('brand.chroma', brand.chroma)
  finite('brand.hue', brand.hue)
  finite('brand.lightness', brand.lightness)
  finite('contrastTarget', contrastTarget)
  finite('density', density)
  finite('radius', radius)

  if (brand.chroma < 0) {
    throw new RangeError(`deriveTheme: brand.chroma must not be negative, received ${brand.chroma}`)
  }
  if (brand.lightness < 0 || brand.lightness > 1) {
    throw new RangeError(
      `deriveTheme: brand.lightness must be between 0 and 1, received ${brand.lightness}`,
    )
  }
  // 1 is "no contrast at all" and 21 is black on white. Anything outside that
  // is not a target, it is a typo.
  if (contrastTarget < 1 || contrastTarget > 21) {
    throw new RangeError(
      `deriveTheme: contrastTarget must be between 1 and 21, received ${contrastTarget}`,
    )
  }
  if (density <= 0) {
    throw new RangeError(`deriveTheme: density must be positive, received ${density}`)
  }
  if (radius < 0) {
    throw new RangeError(`deriveTheme: radius must not be negative, received ${radius}`)
  }
}

/**
 * Computes a complete token set from intent inputs.
 *
 * Foreground colors are solved for their contrast target rather than picked and
 * then audited, so a passing theme is guaranteed by construction. Anything that
 * could not reach its target at the requested chroma is reported in
 * `violations` rather than silently shipped.
 *
 * @throws {TypeError} when any numeric input is not finite.
 * @throws {RangeError} when an input is outside the range it is meaningful in.
 */
export const deriveTheme = (intent: ThemeIntent): DerivedTheme => {
  const resolved: Required<ThemeIntent> = { ...DEFAULTS, ...intent }
  assertUsableIntent(resolved)
  const { brand, contrastTarget, scheme } = resolved

  const neutral = { chroma: 0.008, hue: brand.hue }

  // Raw values are what the intent asked for; fitted values are what can be
  // rendered. Tokens carry the raw so they can report the difference, while
  // every contrast solve uses the fitted version. Solving against a color that
  // cannot be rendered and then measuring against the one that can is how a
  // palette passes in theory and fails by a hundredth in practice.
  const rawBackground: Oklch =
    scheme === 'dark' ? { ...neutral, lightness: 0.15 } : { ...neutral, lightness: 0.985 }
  const rawSurface: Oklch =
    scheme === 'dark' ? { ...neutral, lightness: 0.21 } : { chroma: 0, hue: 0, lightness: 1 }
  /* **The surfaces a component actually names, not just the two the page has.**
     A dropdown sits on `surface-overlay`, a recess on `surface-sunken`, a card
     that lifts on `surface-raised`. Emitting only `background` and `surface`
     left every one of those reading a token nothing derived, so a themed panel
     kept the stock greys exactly where a popover opened. */
  /* Stated per scheme rather than stepped off `surface`, because a step has to
     know which way is away and the answer is not the same for all three. Raised
     and overlay move off the surface; sunken goes *under the background*, and a
     light theme's surface is already pure white, so stepping it produced a
     lightness of 1.05 and the gamut check caught it. */
  const rawRaised: Oklch = { ...neutral, lightness: scheme === 'dark' ? 0.25 : 0.96 }
  const rawOverlay: Oklch = { ...neutral, lightness: scheme === 'dark' ? 0.25 : 1 }
  const rawSunken: Oklch = { ...neutral, lightness: scheme === 'dark' ? 0.11 : 0.93 }

  const background = fitToGamut(rawBackground)
  const surface = fitToGamut(rawSurface)

  // Text lands on more than one surface, and the hardest one is not always the
  // page background: in a dark theme `surface` is *lighter* than `background`,
  // so light text loses contrast there. Solving against a single surface ships
  // a palette that passes on the page and fails inside every card.
  const surfaces = [background, surface, fitToGamut(rawRaised), fitToGamut(rawSunken)]
  const solveForAll = (sample: Omit<Oklch, 'lightness'>, target: number): Oklch => {
    const worstCase = (candidate: Oklch): number =>
      Math.min(...surfaces.map((s) => contrastRatio(fitToGamut(candidate), s)))

    return surfaces
      .map((s) => lightnessForContrast(sample, s, target))
      .reduce((best, candidate) => (worstCase(candidate) > worstCase(best) ? candidate : best))
  }

  const foreground = solveForAll(neutral, contrastTarget * 1.6)
  const foregroundMuted = solveForAll(neutral, contrastTarget)
  const border = lightnessForContrast(neutral, background, 1.4)

  // The brand color keeps its hue and chroma; only lightness moves to meet the
  // target. That is what preserves brand identity while guaranteeing contrast.
  const rawPrimary = solveForAll({ chroma: brand.chroma, hue: brand.hue }, contrastTarget)
  const primary = fitToGamut(rawPrimary)

  /* **The primary's own steps, because components read them and nothing made
     them.** `hover` and `active` are the same colour under a pointer and under
     a press, so they step in lightness and keep the hue and chroma that make it
     the brand. `subtle` is the tinted ground a quiet badge sits on, which is
     near the page rather than near the brand.

     The direction is toward the ink in both schemes: darker on a light page,
     lighter on a dark one, so a press always reads as more rather than as
     whichever way the scheme happens to run. */
  const toward = scheme === 'dark' ? 1 : -1
  const step = (by: number): Oklch => ({
    chroma: brand.chroma,
    hue: brand.hue,
    lightness: rawPrimary.lightness + by * toward,
  })
  /* **A brand surface, which `primary` cannot also be.** `primary` is solved to
     be *legible on* the background, so in a dark theme it comes out light by
     construction, and a card filled with it carries dark text. A filled brand
     panel with light text needs the opposite: dark enough that the ink clears
     it.

     `primary-surface` is the stylesheet's own name for this, added there for
     the same reason and with the measurements to match. The engine takes the
     name rather than inventing one, which is the rule that settled the last
     two of these. */
  const primarySurface = lightnessForContrast(
    { chroma: brand.chroma, hue: brand.hue },
    fitToGamut({ chroma: 0, hue: 0, lightness: 0.98 }),
    contrastTarget,
    { darker: true },
  )

  /* Solved against the surface it actually lands on. A brand fill is what
     carries this text, and `primary` is not that fill. */
  const onAccent = lightnessForContrast(
    { chroma: 0, hue: 0 },
    fitToGamut(primarySurface),
    contrastTarget,
  )

  const rawSubtle: Oklch = {
    chroma: Math.min(brand.chroma, 0.06),
    hue: brand.hue,
    lightness: scheme === 'dark' ? rawSurface.lightness + 0.06 : 0.95,
  }

  const tokens: DerivedToken[] = [
    token('color-background', rawBackground),
    token('color-surface', rawSurface),
    token('color-border', border, background),
    token('color-foreground', foreground, background),
    token('color-foreground-muted', foregroundMuted, background),
    token('color-surface-raised', rawRaised),
    token('color-surface-overlay', rawOverlay),
    token('color-surface-sunken', rawSunken),
    token('color-primary', rawPrimary, background),
    /* **`foreground-on-accent`, which is the name the stylesheet reads.** This
       emitted `color-primary-foreground` and nothing consumed it: every
       component putting text on the brand asks for
       `--helix-color-foreground-on-accent`, so the engine and the token layer
       were naming the same colour differently and a themed page kept the stock
       one. The token layer has 135 names and this has a handful, so the
       handful moved. */
    token('color-foreground-on-accent', onAccent, primarySurface),
    token('color-primary-hover', step(0.05)),
    token('color-primary-active', step(0.1)),
    token('color-primary-subtle', rawSubtle),
    token('color-primary-surface', primarySurface),
  ]

  // Pairings are declared explicitly rather than inferred from token names.
  // Text sits on `surface` as often as on `background` (cards, dialogs, menus),
  // and a palette that only verifies one of them ships a real failure.
  const pairings: Array<[string, Oklch, Oklch]> = [
    ['foreground on background', foreground, background],
    ['foreground on surface', foreground, surface],
    ['foreground-muted on background', foregroundMuted, background],
    ['foreground-muted on surface', foregroundMuted, surface],
    ['primary on background', primary, background],
    ['foreground-on-accent on primary-surface', onAccent, fitToGamut(primarySurface)],
    ['foreground on surface-raised', foreground, fitToGamut(rawRaised)],
    ['foreground on surface-overlay', foreground, fitToGamut(rawOverlay)],
    ['foreground on surface-sunken', foreground, fitToGamut(rawSunken)],
    ['foreground-muted on surface-overlay', foregroundMuted, fitToGamut(rawOverlay)],
  ]

  const violations = pairings
    .map(([label, fg, bg]) => [label, contrastRatio(fitToGamut(fg), bg)] as const)
    .filter(([, ratio]) => ratio < contrastTarget)
    .map(([label, ratio]) => `${label}: ${ratio.toFixed(2)}:1 below target ${contrastTarget}:1`)

  return { intent: resolved, tokens, violations }
}

/** Renders a derived theme as a CSS custom-property block. */
export const toCss = (theme: DerivedTheme, selector = ':root'): string => {
  const { density, radius } = theme.intent
  const lines = theme.tokens.map((t) => `  --helix-${t.name}: ${t.hex};`)
  /* **The public seed names, which is what the stylesheet reads them back
     through.** This emitted `--helix-seed-radius` against a
     `--_helix-seed-radii` nothing else spells that way, and both names were
     private in `primitives.css` regardless, so neither figure reached a page:
     a derived theme moved its colours and left density and corners alone.

     The colour seeds are deliberately not emitted here. `tokens` already
     carries every colour this solves for, under the names components read, and
     a seed beside them would be a second input to the same values that the CSS
     re-derives its own way. Density and radii have no such pair: nothing in
     `tokens` expresses them, so the seed is the only channel. */
  lines.push(`  --helix-seed-density: ${density};`)
  lines.push(`  --helix-seed-radii: ${radius}rem;`)
  return `${selector} {\n${lines.join('\n')}\n}\n`
}
