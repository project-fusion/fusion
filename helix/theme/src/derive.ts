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
 * Computes a complete token set from intent inputs.
 *
 * Foreground colors are solved for their contrast target rather than picked and
 * then audited, so a passing theme is guaranteed by construction. Anything that
 * could not reach its target at the requested chroma is reported in
 * `violations` rather than silently shipped.
 */
export const deriveTheme = (intent: ThemeIntent): DerivedTheme => {
  const resolved: Required<ThemeIntent> = { ...DEFAULTS, ...intent }
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
  const background = fitToGamut(rawBackground)
  const surface = fitToGamut(rawSurface)

  // Text lands on more than one surface, and the hardest one is not always the
  // page background: in a dark theme `surface` is *lighter* than `background`,
  // so light text loses contrast there. Solving against a single surface ships
  // a palette that passes on the page and fails inside every card.
  const surfaces = [background, surface]
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
  const primaryForeground = lightnessForContrast({ chroma: 0, hue: 0 }, primary, contrastTarget)

  const tokens: DerivedToken[] = [
    token('color-background', rawBackground),
    token('color-surface', rawSurface),
    token('color-border', border, background),
    token('color-foreground', foreground, background),
    token('color-foreground-muted', foregroundMuted, background),
    token('color-primary', rawPrimary, background),
    token('color-primary-foreground', primaryForeground, primary),
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
    ['primary-foreground on primary', primaryForeground, primary],
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
  lines.push(`  --helix-seed-density: ${density};`)
  lines.push(`  --helix-seed-radius: ${radius}rem;`)
  return `${selector} {\n${lines.join('\n')}\n}\n`
}
