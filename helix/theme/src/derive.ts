import {
  type Color,
  isRelation,
  type PairingRequest,
  STATUS_HUE,
  type StatusName,
  type ThemeIntent,
  toOklch,
} from './intent.js'
import { contrastRatio, fitToGamut, lightnessForContrast, type Oklch, oklchToHex } from './oklch.js'

export type { Color, PairingRequest, Relation, Seed, StatusSeed, ThemeIntent } from './intent.js'

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
  /**
   * Where the value came from. `derived` was solved, `related` was rotated off
   * another role, `pinned` was supplied by the consumer. It is what lets a
   * reader of the emitted file tell a decision from a computation.
   */
  origin: 'derived' | 'pinned' | 'related'
  /** Always inside the sRGB gamut. */
  value: Oklch
}

/** One measured pair, whatever the outcome. */
export interface Pairing {
  background: string
  foreground: string
  /**
   * Measured contrast. Absent when `status` is `unverifiable`, because there
   * was no ground to measure against.
   */
  ratio?: number
  /**
   * **`unverifiable` is not a softer `fail`.** It means the pair was never
   * measured, which a reader has to be able to tell from a pair that was
   * measured and passed. Folding the two together is how a guarantee decays
   * into a claim about the pairs that happened to be easy.
   *
   * One producer today: a pairing naming a token this theme does not emit,
   * which a caller supplying their own `pairings` will legitimately do.
   * Translucent grounds are the second, when `material` lands: what sits
   * behind a glass surface is whatever the reader scrolled under it.
   */
  status: 'fail' | 'pass' | 'unverifiable'
}

export interface DerivedTheme {
  /**
   * Roles too close to tell apart, measured as perceptual distance rather than
   * contrast. Empty means every role is distinguishable.
   *
   * A different finding from `violations` and neither substitutes for the
   * other: contrast is a token against a ground, a collision is two roles
   * against each other.
   */
  collisions: string[]
  intent: Required<ThemeIntent>
  /**
   * Every pair the theme was checked against, whatever the outcome.
   *
   * Structured rather than a list of sentences, which is what lets a consumer
   * program against it, lets a builder render it, and stops an unmeasured pair
   * from being invisible to anybody who only reads `violations`.
   */
  pairings: Pairing[]
  tokens: DerivedToken[]
  /**
   * Pairings that failed their contrast target, pinned values included.
   * Rendered from `pairings`, and no longer the only record of a result.
   */
  violations: string[]
}

const DEFAULTS = {
  accent: { from: 'brand', rotate: 180 },
  chroma: {},
  contrastTarget: 4.5,
  density: 1,
  namespace: 'helix',
  neutral: {},
  radius: 0.5,
  scheme: 'light',
  status: {},
  tokens: {},
} as const

/**
 * Perceptual distance below which two roles are not reliably distinguishable.
 *
 * `tokens.css` measured the muted series at 0.064 in OKLab and recorded that
 * as below what anybody tells apart, so the threshold sits just above it.
 */
const COLLISION_DISTANCE = 0.08

/** Euclidean distance in OKLab, which is what OKLCH exists to make meaningful. */
const perceptualDistance = (a: Oklch, b: Oklch): number => {
  const toLab = ({ chroma, hue, lightness }: Oklch): [number, number, number] => {
    const rad = (hue * Math.PI) / 180
    return [lightness, chroma * Math.cos(rad), chroma * Math.sin(rad)]
  }
  const [l1, a1, b1] = toLab(a)
  const [l2, a2, b2] = toLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

/**
 * Builds a token, fitting the color into the sRGB gamut first so that both the
 * emitted hex and the recorded contrast describe what actually ships.
 */
const token = (
  name: string,
  raw: Oklch,
  origin: DerivedToken['origin'] = 'derived',
  against?: Oklch,
): DerivedToken => {
  const value = fitToGamut(raw)
  return {
    chromaReduced: value.chroma < raw.chroma,
    hex: oklchToHex(value),
    name,
    origin,
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
const assertUsableIntent = (resolved: Required<ThemeIntent>): void => {
  const { contrastTarget, density, radius } = resolved
  const brand = toOklch(resolved.brand)
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

  /* The chroma policy gets the same guard for the same reason as everything
     above: a NaN ceiling makes every `Math.min` against it return NaN, which
     produces a palette of `#000000` that reports no violations, because every
     `ratio < target` comparison against NaN is false. */
  const { ceiling, scale } = resolved.chroma
  if (ceiling !== undefined) {
    finite('chroma.ceiling', ceiling)
    if (ceiling < 0) {
      throw new RangeError(`deriveTheme: chroma.ceiling must not be negative, received ${ceiling}`)
    }
  }
  if (scale !== undefined) {
    finite('chroma.scale', scale)
    if (scale < 0) {
      throw new RangeError(`deriveTheme: chroma.scale must not be negative, received ${scale}`)
    }
  }
  const allowance = resolved.status.allowance
  if (allowance !== undefined) {
    finite('status.allowance', allowance)
    if (allowance < 0 || allowance > 180) {
      throw new RangeError(
        `deriveTheme: status.allowance must be between 0 and 180 degrees, received ${allowance}`,
      )
    }
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
  const resolved: Required<ThemeIntent> = {
    ...DEFAULTS,
    pairings: DEFAULT_PAIRINGS,
    ...intent,
  }
  assertUsableIntent(resolved)
  const { contrastTarget, scheme } = resolved

  /* The chroma policy, applied to everything this engine derives and to
     nothing it is handed. A pinned colour is a fact about the brand; a derived
     one is this palette's opinion, and the policy is what that opinion is. */
  const { ceiling, scale = 1 } = resolved.chroma
  const policy = (chroma: number): number =>
    Math.max(0, Math.min(ceiling ?? Number.POSITIVE_INFINITY, chroma * scale))

  const rawBrand = toOklch(resolved.brand)
  const brand: Oklch = { ...rawBrand, chroma: policy(rawBrand.chroma) }

  /* Chroma 0 by default, which is what `primitives.css` settled on and wrote
     down: a fixed chroma is a rising saturation as a surface darkens, so the
     0.008 this engine used to hardcode read navy across a dark page. The two
     files disagreed on the value and nothing compared them. */
  const neutral = {
    chroma: policy(resolved.neutral.chroma ?? 0),
    hue: resolved.neutral.hue ?? brand.hue,
  }

  /* The accent, pinned or related. A relation keeps the brand's lightness and
     takes at most its chroma, because an accent louder than the thing it
     accents is a second primary. */
  const accentSeed = resolved.accent
  const accentIsPinned = !isRelation(accentSeed)
  const accent: Oklch = accentIsPinned
    ? toOklch(accentSeed)
    : {
        chroma: policy(rawBrand.chroma * Math.min(1, accentSeed.chroma ?? 1)),
        hue: (rawBrand.hue + accentSeed.rotate) % 360,
        lightness: rawBrand.lightness,
      }

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

  /* An emphasis role, solved the same way whichever role it is. The brand and
     the accent behaving differently from each other is a difference a consumer
     would have to learn, and there is no reason for one. */
  const emphasis = (base: Oklch) => {
    const raw = solveForAll({ chroma: base.chroma, hue: base.hue }, contrastTarget)
    const toward = scheme === 'dark' ? 1 : -1
    const step = (by: number): Oklch => ({
      chroma: base.chroma,
      hue: base.hue,
      lightness: raw.lightness + by * toward,
    })
    /* **A brand surface, which `primary` cannot also be.** `primary` is solved
       to be *legible on* the background, so in a dark theme it comes out light
       by construction, and a card filled with it carries dark text. A filled
       brand panel with light text needs the opposite: dark enough that the ink
       clears it. */
    const filled = lightnessForContrast(
      { chroma: base.chroma, hue: base.hue },
      fitToGamut({ chroma: 0, hue: 0, lightness: 0.98 }),
      contrastTarget,
      { darker: true },
    )
    return {
      active: step(0.1),
      filled,
      hover: step(0.05),
      raw,
      subtle: {
        chroma: Math.min(base.chroma, policy(0.06)),
        hue: base.hue,
        lightness: scheme === 'dark' ? rawSurface.lightness + 0.06 : 0.95,
      },
    }
  }

  const primary = emphasis(brand)
  const accentSteps = emphasis(accent)

  /* Solved against the surface it actually lands on. A brand fill is what
     carries this text, and `primary` is not that fill. */
  const onAccent = lightnessForContrast(
    { chroma: 0, hue: 0 },
    fitToGamut(primary.filled),
    contrastTarget,
  )

  /* **Status: hue is fixed by meaning, everything else derives.**

     The rejected idea was rotating status *with* the brand, which makes a
     warning a reader has to re-learn per product. That is not the same as
     letting status take the palette's chroma and solve its own lightness, and
     conflating the two is what left four ramps as literals: a monotone theme
     got a vivid red danger, which reads as a bug rather than as a warning.

     `allowance` is the repair rather than the report. A red brand beside a red
     danger carries no information, so a status may rotate away from the brand,
     within its meaning, until it is distinguishable. */
  const statusIntent = resolved.status
  const allowance = statusIntent.allowance ?? 0
  const statusColors = new Map<StatusName, { color: Oklch; pinned: boolean }>()
  for (const name of Object.keys(STATUS_HUE) as StatusName[]) {
    const supplied = statusIntent[name]
    if (supplied !== undefined && (typeof supplied === 'string' || 'lightness' in supplied)) {
      statusColors.set(name, { color: toOklch(supplied as Color), pinned: true })
      continue
    }
    const hue = (supplied as { hue?: number } | undefined)?.hue ?? STATUS_HUE[name]
    const chroma = policy(rawBrand.chroma)
    let resolvedHue = hue
    if (allowance > 0) {
      /* Rotate away from the brand rather than toward it, one degree at a time,
         and stop the moment it clears. Away is whichever direction increases
         the separation, so a brand on either side of the status is handled by
         the same loop. */
      const away = ((hue - brand.hue + 540) % 360) - 180 >= 0 ? 1 : -1
      for (let step = 0; step <= allowance; step += 1) {
        resolvedHue = (hue + away * step + 360) % 360
        const candidate = solveForAll({ chroma, hue: resolvedHue }, contrastTarget)
        if (
          perceptualDistance(fitToGamut(candidate), fitToGamut(primary.raw)) >= COLLISION_DISTANCE
        ) {
          break
        }
      }
    }
    statusColors.set(name, {
      color: solveForAll({ chroma, hue: resolvedHue }, contrastTarget),
      pinned: false,
    })
  }

  const tokens: DerivedToken[] = [
    token('color-background', rawBackground),
    token('color-surface', rawSurface),
    token('color-border', border, 'derived', background),
    token('color-foreground', foreground, 'derived', background),
    token('color-foreground-muted', foregroundMuted, 'derived', background),
    token('color-surface-raised', rawRaised),
    token('color-surface-overlay', rawOverlay),
    token('color-surface-sunken', rawSunken),
    token('color-primary', primary.raw, 'derived', background),
    /* **`foreground-on-accent`, which is the name the stylesheet reads.** This
       emitted `color-primary-foreground` and nothing consumed it: every
       component putting text on the brand asks for
       `--helix-color-foreground-on-accent`, so the engine and the token layer
       were naming the same colour differently and a themed page kept the stock
       one. The token layer has 135 names and this has a handful, so the
       handful moved. */
    token('color-foreground-on-accent', onAccent, 'derived', primary.filled),
    token('color-primary-hover', primary.hover),
    token('color-primary-active', primary.active),
    token('color-primary-subtle', primary.subtle),
    token('color-primary-surface', primary.filled),
    token('color-accent', accentSteps.raw, accentIsPinned ? 'pinned' : 'related', background),
    token('color-accent-hover', accentSteps.hover, accentIsPinned ? 'pinned' : 'related'),
    token('color-accent-active', accentSteps.active, accentIsPinned ? 'pinned' : 'related'),
    token('color-accent-subtle', accentSteps.subtle, accentIsPinned ? 'pinned' : 'related'),
    token('color-accent-surface', accentSteps.filled, accentIsPinned ? 'pinned' : 'related'),
    ...[...statusColors].map(([name, { color, pinned }]) =>
      token(`color-${name}`, color, pinned ? 'pinned' : 'derived', background),
    ),
  ]

  /* A pinned token replaces one output and is verified like anything else.
     Applied last so it wins, and recorded as `pinned` so a reader of the file
     can tell a decision from a computation. */
  for (const [name, color] of Object.entries(resolved.tokens)) {
    const pinned = token(name, toOklch(color), 'pinned')
    const at = tokens.findIndex((t) => t.name === name)
    if (at >= 0) {
      tokens[at] = pinned
    } else {
      tokens.push(pinned)
    }
  }

  const byName = new Map(tokens.map((t) => [t.name, t.value]))

  /* **Every requested pair, whatever the outcome.** A pair naming a token this
     theme does not emit is `unverifiable` rather than dropped, which matters
     the moment a caller supplies pairings against their own token set: a pair
     silently missing from the results is how a guarantee becomes a claim about
     the pairs that happened to be easy. */
  const pairings: Pairing[] = resolved.pairings.map(({ background: bg, foreground: fg }) => {
    const ink = byName.get(fg)
    const ground = byName.get(bg)
    if (!ink || !ground) {
      return { background: bg, foreground: fg, status: 'unverifiable' as const }
    }
    const ratio = contrastRatio(fitToGamut(ink), fitToGamut(ground))
    return {
      background: bg,
      foreground: fg,
      ratio,
      status: ratio < contrastTarget ? ('fail' as const) : ('pass' as const),
    }
  })

  const violations = pairings
    .filter((p) => p.status === 'fail')
    .map(
      (p) =>
        `${p.foreground} on ${p.background}: ${p.ratio?.toFixed(2)}:1 below target ${contrastTarget}:1`,
    )

  /* Roles against each other rather than against a ground. Every pair once,
     which is what the index comparison is for. */
  const roles: Array<[string, Oklch]> = [
    ['primary', primary.raw],
    ['accent', accentSteps.raw],
    ...[...statusColors].map(([name, { color }]) => [name, color] as [string, Oklch]),
  ]
  const collisions: string[] = []
  for (const [i, [nameA, colorA]] of roles.entries()) {
    for (const [nameB, colorB] of roles.slice(i + 1)) {
      const distance = perceptualDistance(fitToGamut(colorA), fitToGamut(colorB))
      if (distance < COLLISION_DISTANCE) {
        collisions.push(
          `${nameA} and ${nameB} are ${distance.toFixed(3)} apart in OKLab, below ` +
            `${COLLISION_DISTANCE}, so a reader cannot reliably tell them apart`,
        )
      }
    }
  }

  return { collisions, intent: resolved, pairings, tokens, violations }
}

/**
 * The pairs this engine's own token set is checked against.
 *
 * Declared explicitly rather than inferred from token names. Text sits on
 * `surface` as often as on `background` (cards, dialogs, menus), and a palette
 * that only verifies one of them ships a real failure.
 *
 * **Ten pairs is a claim about ten pairs.** Real interfaces carry pairs nobody
 * enumerated: a tag on a raised card, placeholder text, a focus ring on a
 * filled button. This is the default rather than the truth, which is why
 * `pairings` is an input, and generating it from what components actually
 * paint is #141's remaining work.
 */
export const DEFAULT_PAIRINGS: PairingRequest[] = [
  { background: 'color-background', foreground: 'color-foreground' },
  { background: 'color-surface', foreground: 'color-foreground' },
  { background: 'color-background', foreground: 'color-foreground-muted' },
  { background: 'color-surface', foreground: 'color-foreground-muted' },
  { background: 'color-background', foreground: 'color-primary' },
  { background: 'color-primary-surface', foreground: 'color-foreground-on-accent' },
  { background: 'color-surface-raised', foreground: 'color-foreground' },
  { background: 'color-surface-overlay', foreground: 'color-foreground' },
  { background: 'color-surface-sunken', foreground: 'color-foreground' },
  { background: 'color-surface-overlay', foreground: 'color-foreground-muted' },
]

/**
 * Renders a derived theme as a CSS custom-property block.
 *
 * **The seeds are emitted beside the tokens, and that is what stops the two
 * derivations disagreeing.** `helix/styles` derives a ramp of its own from
 * `--helix-seed-*`, including the twenty-four series colours a chart reads, and
 * nothing here reaches those. Emitting the tokens alone moved the buttons, the
 * tags and the surfaces and left every chart on the page the original blue,
 * which the marketing site worked around by writing the seed itself. `check:seeds`
 * holds the two name sets to each other now, in both directions.
 */
export const toCss = (theme: DerivedTheme, selector = ':root'): string => {
  const { density, namespace, radius } = theme.intent
  const lines = theme.tokens.map((t) => `  --${namespace}-${t.name}: ${t.hex};`)

  const brand = theme.tokens.find((t) => t.name === 'color-primary')
  if (brand) {
    lines.push(`  --${namespace}-seed-brand: ${brand.hex};`)
  }
  lines.push(`  --${namespace}-seed-density: ${density};`)
  lines.push(`  --${namespace}-seed-radii: ${radius}rem;`)
  return `${selector} {\n${lines.join('\n')}\n}\n`
}
