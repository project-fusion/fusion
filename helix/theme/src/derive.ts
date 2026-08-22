import {
  type Color,
  isRelation,
  type PairingRequest,
  STATUS_CHROMA,
  STATUS_HUE,
  type StatusName,
  type ThemeIntent,
  toOklch,
} from './intent.js'
import { GROUNDS, INKS, STATUSES } from './model.js'
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
  /**
   * The ratio this pair had to reach. Recorded rather than inferred from the
   * theme, because a focus ring answers to WCAG 1.4.11 at 3:1 while text
   * answers to `contrastTarget`, and a reader of one row should not have to
   * know which kind it is looking at.
   */
  target: number
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
  /**
   * The seed values a consumer must write for `helix/styles` to re-derive the
   * halves this engine does not compute: the twenty-four series colours, the
   * spacing scale and the corner radii.
   *
   * **Data rather than only a line of CSS**, because the two consumers apply it
   * differently. `toCss` renders a block; a page theming one panel writes the
   * properties onto that element. Both read this, so neither can hold a
   * different opinion about what the seed is, which is exactly what the
   * marketing site's hand-written bridge had become.
   */
  seeds: Record<string, string>
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
  font: {},
  material: {},
  motion: {},
  namespace: 'helix',
  neutral: {},
  radius: 0.5,
  scheme: 'light',
  separation: {},
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
    /* Derived from the target the caller asked for, so a theme at AAA checks
       its text against AAA rather than against the default the list was built
       with. A constant could not have done that. */
    pairings: intent.pairings ?? defaultPairings(intent.contrastTarget ?? DEFAULTS.contrastTarget),
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
  /* **The page is pure white and pure black, and it was neither.**
     `tokens.css` states the decision outright, that the page is `#ffffff` and
     `#000000` and is the one fixed point either mode has, and records rejecting
     the near-black it was briefly given to make room underneath for `sunken`.
     This engine shipped that rejected arrangement and worse: in light it had
     the page at 0.985 and `surface` at pure white, which is the two of them the
     wrong way round, so a themed page came out faintly grey with white cards on
     it where the stylesheet paints a white page with faintly grey cards.

     The third disagreement of this kind between the two derivations, after the
     dead density seeds and the neutral chroma the stylesheet had already
     rejected for reading navy. `check:seeds` holds the names to each other and
     nothing holds the values, which is #141's remaining work.

     No cast on the page, for the reason the primitive gives: it is the one
     surface with nothing behind it to sit against, so the trace of brand hue
     that makes a card feel part of the palette has nothing to do there and
     reads as a colour cast across the whole window. */
  const rawBackground: Oklch =
    scheme === 'dark' ? { chroma: 0, hue: 0, lightness: 0 } : { chroma: 0, hue: 0, lightness: 1 }
  const rawSurfaceBase: Oklch =
    scheme === 'dark' ? { ...neutral, lightness: 0.21 } : { ...neutral, lightness: 0.985 }
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
  /* **`fill` and `space` were doing nothing, and this is the fix.**
     Both emitted a zero edge and no lift, which made them identical to each
     other and left two of the four mechanisms as options a reader could pick
     with no effect. A mechanism nobody can see is not a choice.

     What separates a surface, when it is neither an edge nor a lift, is how far
     its own colour sits from the page. So the policy scales that distance:
     `fill` pushes the ladder away from the background, `space` collapses it
     onto the background so nothing but the gap tells them apart, and `border`
     and `shadow` leave it where it has always been because on those the edge or
     the lift is doing the work. */
  const LADDER = { border: 1, fill: 1.7, shadow: 1, space: 0 } as const
  const ladder = LADDER[resolved.separation.surface ?? 'border']
  const step = (from: number): Oklch => ({
    ...neutral,
    lightness: rawBackground.lightness + (from - rawBackground.lightness) * ladder,
  })

  /* **Every rung taken from the stylesheet's own ladder**, since the two are
     meant to agree for the brand that ships and every figure here was a little
     off: raised and overlay sat at 0.25 against `neutral-800`'s 0.29, and
     sunken at 0.11 against `neutral-950`'s 0.15. Small enough to look like
     rounding and large enough to be a different grey.

     `overlay` is pure white in light and takes no cast, matching `neutral-0`:
     a menu on a white page is white, which is what every desktop menu does. */
  const rawRaised: Oklch = step(scheme === 'dark' ? 0.29 : 0.97)
  const rawOverlay: Oklch = scheme === 'dark' ? step(0.29) : { chroma: 0, hue: 0, lightness: 1 }
  const rawSunken: Oklch = step(scheme === 'dark' ? 0.15 : 0.96)

  const background = fitToGamut(rawBackground)
  /* Declared after the ladder, since `surface` is on it: it is the ground a card
     uses, so a fill-first theme has to move it too or the one surface the policy
     is most about is the one it does not reach. */
  const rawSurface = step(rawSurfaceBase.lightness)
  const surface = fitToGamut(rawSurface)

  // Text lands on more than one surface, and the hardest one is not always the
  // page background: in a dark theme `surface` is *lighter* than `background`,
  // so light text loses contrast there. Solving against a single surface ships
  // a palette that passes on the page and fails inside every card.
  const surfaces = [background, surface, fitToGamut(rawRaised), fitToGamut(rawSunken)]
  /**
   * Solves one ink against every ground it lands on, keeping whichever
   * candidate has the best worst case.
   *
   * **Grounds are a parameter because the model says which ones**, and that is
   * the whole correction: a hardcoded surface list solved `primary` against the
   * page and left it failing on the tinted badge it also sits in.
   */
  const solveAgainst = (
    grounds: Oklch[],
    sample: Omit<Oklch, 'lightness'>,
    target: number,
  ): Oklch => {
    const worstCase = (candidate: Oklch): number =>
      Math.min(...grounds.map((g) => contrastRatio(fitToGamut(candidate), g)))

    return grounds
      .map((g) => lightnessForContrast(sample, g, target))
      .reduce((best, candidate) => (worstCase(candidate) > worstCase(best) ? candidate : best))
  }

  /** The page ladder, which is what an ink with no ground of its own sits on. */
  const solveForAll = (sample: Omit<Oklch, 'lightness'>, target: number): Oklch =>
    solveAgainst(surfaces, sample, target)

  const foreground = solveForAll(neutral, contrastTarget * 1.6)
  const foregroundMuted = solveForAll(neutral, contrastTarget)
  const border = lightnessForContrast(neutral, background, 1.4)

  /* An emphasis role, solved the same way whichever role it is. The brand and
     the accent behaving differently from each other is a difference a consumer
     would have to learn, and there is no reason for one. */
  const emphasis = (base: Oklch) => {
    /* **Solved against its own tint as well as the page, because that is where
       it lands.** The model says `primary` sits on the five page surfaces *and*
       on `primary-subtle`, which is the ground a quiet badge gives it, and the
       solver was reading a hardcoded surface list that did not include it. In
       dark mode the tint is lighter than every page surface, so a primary
       solved against the page alone came out at 4.25:1 on the one ground a
       consumer most expects it to work on.

       No cycle: the tint depends on the base colour and the scheme, never on
       the solved ink, so it is computed first and solved against. */
    const subtle: Oklch = {
      chroma: Math.min(base.chroma, policy(0.06)),
      hue: base.hue,
      lightness: scheme === 'dark' ? rawSurfaceBase.lightness + 0.06 : 0.95,
    }
    const raw = solveAgainst(
      [...surfaces, fitToGamut(subtle)],
      { chroma: base.chroma, hue: base.hue },
      contrastTarget,
    )
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
    return { active: step(0.1), filled, hover: step(0.05), raw, subtle }
  }

  const primary = emphasis(brand)

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
  /* **20 by default, not 0**, so the shipped palette does not report a
     collision it has the means to fix: `primary` and `info` are both blue on
     the Fusion brand, and twenty degrees moves `info` by three, which is
     nowhere near enough to stop reading as informational and exactly enough to
     be told apart.

     **What 20 does not reach is a brand that *is* a status colour**, and the
     figure is worth writing down rather than discovering. Clearing a collision
     between two hues that start coincident is a chord across the hue circle, so
     the rotation it takes scales inversely with chroma: at 0.15 it is about 31
     degrees before the distance reaches the threshold. Measured, as collisions
     remaining at each allowance:

       brand              0   10   20   30   40
       blue  #3b82f6      1    0    0    0    0
       red   #c1272d      1    1    1    0    0
       green #16a34a      1    1    1    0    0
       amber #f59e0b      1    1    1    1    0

     So 20 answers the palette that ships and a brand near a status still
     reports. That is the honest trade rather than an oversight: the allowance
     is a licence to bend a convention and 40 degrees of amber is not amber. A
     consumer whose brand collides raises it deliberately and sees what it costs
     in the builder.

     A status spends only what it needs, the search stopping at the first hue
     that clears, and keeps its own hue entirely when nothing inside the bound
     works. Set it to 0 to hold every status where convention puts it. */
  const allowance = statusIntent.allowance ?? 20
  const statusColors = new Map<StatusName, { color: Oklch; pinned: boolean }>()
  /* **Every role resolved so far, which grows as the loop runs.** A status
     rotated clear of the accent can land on the status decided before it: with
     the shipped blue, `warning` moved to 47 to clear an accent at 80 and came
     to rest 20 degrees from `danger`. Repairing against a fixed set answers one
     collision by creating another, so the set accumulates and the order is the
     declared one, which makes it deterministic. */
  const settled: Oklch[] = []
  for (const name of Object.keys(STATUS_HUE) as StatusName[]) {
    const supplied = statusIntent[name]
    if (supplied !== undefined && (typeof supplied === 'string' || 'lightness' in supplied)) {
      const pinnedColor = toOklch(supplied as Color)
      settled.push(pinnedColor)
      statusColors.set(name, { color: pinnedColor, pinned: true })
      continue
    }
    const hue = (supplied as { hue?: number } | undefined)?.hue ?? STATUS_HUE[name]
    /* The status's own chroma, scaled by the policy, and never the brand's:
       see `STATUS_CHROMA` for what taking the brand's did to a muted one. */
    const chroma = policy(STATUS_CHROMA[name])
    let resolvedHue = hue
    if (allowance > 0) {
      /* **Against the brand and against the statuses already settled.**
         Deliberately not against the accent, which has not been decided yet:
         the accent is the role that yields, so a status must not spend its
         allowance getting out of the way of something that is about to move
         itself. See the accent's own search below.

         The set accumulates, so a status rotated clear of the brand cannot land
         on the status decided before it: `warning` came to rest 20 degrees from
         `danger` when it did not. Declared order, so it is deterministic. */
      const decided = [primary.raw, ...settled]
      const clears = (candidate: Oklch): boolean =>
        decided.every(
          (role) =>
            perceptualDistance(fitToGamut(candidate), fitToGamut(role)) >= COLLISION_DISTANCE,
        )

      /* Both directions at each step rather than a direction chosen up front.
         Away from one role can be toward another, so the only honest search is
         to widen outward and take the first hue that clears everything. */
      /* **A repair either works or it does not happen.** The first version kept
         whatever hue it had reached when the allowance ran out, which is the
         worst of both outcomes: with the shipped blue, `warning` walked the
         full forty degrees to 115, came to rest in the greens, and still
         collided. A warning that has stopped looking like a warning *and* is
         still indistinguishable is worse than one that only collides, and
         `collisions` is there to report the failure honestly. */
      for (let step = 0; step <= allowance; step += 1) {
        const tries = step === 0 ? [hue] : [hue + step, hue - step]
        const found = tries
          .map((candidate) => (candidate + 360) % 360)
          .find((candidate) => clears(solveForAll({ chroma, hue: candidate }, contrastTarget)))
        if (found !== undefined) {
          resolvedHue = found
          break
        }
      }
    }
    const color = solveForAll({ chroma, hue: resolvedHue }, contrastTarget)
    settled.push(color)
    statusColors.set(name, { color, pinned: false })
  }

  /* **The accent yields, because it is the only role with nothing to lose.**

     A status hue carries meaning: a reader learns amber for caution once and
     should not learn it again per product. A brand is a fact the consumer
     supplied. An accent is a *relationship*, and a relationship whose exact
     angle nobody specified has room to move where neither of the others does.

     So it settles last and rotates outward from the angle asked for until it
     clears every role that has already been decided. Measured on the shipped
     blue, where the complement lands at 80 degrees and `warning` is amber at
     75: before this, the two were reported as indistinguishable on every single
     derivation and no allowance could repair it, because `danger` at 27 and
     `success` at 155 box in every hue `warning` could have reached.

     A pinned accent does not move: a colour is a fact. An angle of 0 holds the
     relationship exactly and lets `collisions` report the result. */
  const accentSettled = ((): Oklch => {
    if (accentIsPinned) {
      return accent
    }
    const bound = accentSeed.allowance ?? 45
    const decided = [primary.raw, ...[...statusColors.values()].map(({ color }) => color)]
    const clears = (candidate: Oklch): boolean =>
      decided.every(
        (role) => perceptualDistance(fitToGamut(candidate), fitToGamut(role)) >= COLLISION_DISTANCE,
      )

    for (let step = 0; step <= bound; step += 1) {
      const tries = step === 0 ? [accent.hue] : [accent.hue + step, accent.hue - step]
      const found = tries
        .map((hue) => (hue + 360) % 360)
        .find((hue) => clears(solveForAll({ chroma: accent.chroma, hue }, contrastTarget)))
      if (found !== undefined) {
        return { ...accent, hue: found }
      }
    }
    /* Nothing inside the bound clears, so the angle asked for stands and the
       collision is reported rather than a half-rotation shipped that is neither
       the requested relationship nor distinguishable. */
    return accent
  })()

  const accentSteps = emphasis(accentSettled)

  /* **Every filled ground `foreground-on-accent` lands on, not just the brand's
     resting one.** It was solved against `primary-surface` alone, so a hovered
     button and all four status fills carried an ink nothing had measured
     against them. One token means one colour that clears the worst of them, and
     where that is not reachable the pairing says so rather than the name
     quietly meaning something different per family. */
  const statusFills = new Map<string, { hover: Oklch; rest: Oklch }>()
  for (const status of STATUSES) {
    const { color } = statusColors.get(status) ?? {}
    if (!color) {
      continue
    }
    const steps = emphasis(color)
    statusFills.set(status, { hover: steps.filled, rest: steps.filled })
  }

  /* **A fill darkens under a pointer in both modes, and it is the one hover
     that does not follow the scheme.** An ink's hover steps toward the ink,
     which is lighter on a dark page; a fill already carries light text by
     construction, so lightening it in dark mode takes contrast away from the
     very text it exists to hold. The first version stepped toward the ink for
     consistency and the enumeration caught it at once: six filled grounds fell
     to 3.67:1 against their own label. The stylesheet had it right the whole
     time, `primary-surface` being the 600 and its hover the 700. */
  const hoverOf = (fill: Oklch): Oklch => ({ ...fill, lightness: fill.lightness - 0.05 })

  const filledGrounds: Oklch[] = [
    primary.filled,
    hoverOf(primary.filled),
    accentSteps.filled,
    hoverOf(accentSteps.filled),
    ...[...statusFills.values()].flatMap(({ rest }) => [rest, hoverOf(rest)]),
  ]

  const onAccent = filledGrounds
    .map((ground) =>
      lightnessForContrast({ chroma: 0, hue: 0 }, fitToGamut(ground), contrastTarget),
    )
    .reduce((best, candidate) => {
      const worst = (ink: Oklch): number =>
        Math.min(...filledGrounds.map((g) => contrastRatio(fitToGamut(ink), fitToGamut(g))))
      return worst(candidate) > worst(best) ? candidate : best
    })

  /* The inverse pair, which is one ground and one ink and has to be solved
     together: a toast that is the opposite of the page it sits on. */
  const surfaceInverse: Oklch =
    scheme === 'dark' ? { ...neutral, lightness: 0.95 } : { ...neutral, lightness: 0.2 }
  const foregroundInverse = lightnessForContrast(
    neutral,
    fitToGamut(surfaceInverse),
    contrastTarget * 1.6,
  )

  /* A ring is seen rather than read, so 3:1 under WCAG 1.4.11 rather than the
     text target, and solved against every page surface because a focused
     control can sit on any of them. */
  const focusRing = solveForAll({ chroma: brand.chroma, hue: brand.hue }, 3)

  /* **The brand as a mark: the nearest legible lightness, not the most legible
     one.** A graphic answers to 3:1 under WCAG 1.4.11 rather than the 4.5 a word
     does, so a mark can sit close to the colour a consumer actually chose, and
     that closeness is the whole point of the token.

     `solveForAll` is the wrong solver for it and measurably so. It keeps the
     candidate with the best worst case, which for `#c1272d` chose a lightness
     0.133 away when `primary` had landed 0.025 away: the mark travelled further
     than the text it was supposed to stay closer than. So this walks outward
     from the brand's own lightness and takes the first step that clears, which
     is the same shape as the accent's search and reads the same way.

     Nothing inside the walk clears for a brand that cannot be seen on any page
     surface at any lightness, and the last candidate stands: `pairings` reports
     it rather than the token quietly claiming a legibility it does not have. */
  const brandMark = ((): Oklch => {
    const sample = { chroma: brand.chroma, hue: brand.hue }
    const clears = (lightness: number): boolean =>
      surfaces.every((ground) => contrastRatio(fitToGamut({ ...sample, lightness }), ground) >= 3)

    const asked = brand.lightness
    for (let step = 0; step <= 100; step += 1) {
      const tries = step === 0 ? [asked] : [asked - step / 100, asked + step / 100]
      const found = tries.filter((l) => l >= 0 && l <= 1).find(clears)
      if (found !== undefined) {
        return { ...sample, lightness: found }
      }
    }
    return { ...sample, lightness: asked }
  })()

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
    /* **The grounds the model says exist, which the engine never emitted.** A
       filled danger button, a hovered filled anything, the inverse pair a toast
       uses and the ring a keyboard depends on: each was a ground or an ink the
       stylesheet had and the engine did not, so a themed page kept the stock
       one exactly where it mattered most. */
    token('color-primary-surface-hover', hoverOf(primary.filled)),
    token('color-accent-surface-hover', hoverOf(accentSteps.filled)),
    ...[...statusFills].flatMap(([name, { rest }]) => [
      token(`color-${name}-surface`, rest),
      token(`color-${name}-surface-hover`, hoverOf(rest)),
    ]),
    token('color-surface-inverse', surfaceInverse),
    token('color-foreground-inverse', foregroundInverse, 'derived', surfaceInverse),
    token('color-focus-ring', focusRing, 'derived', background),
    token('color-brand-mark', brandMark, 'derived', background),
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
  /* A ground the model marks unbounded cannot be measured against, whatever the
     theme: what sits behind a media surface is the media. */
  const unbounded = new Set(GROUNDS.filter((g) => !g.bounded).map((g) => g.name))

  const pairings: Pairing[] = resolved.pairings.map(
    ({ background: bg, foreground: fg, target }) => {
      const ink = byName.get(fg)
      const ground = byName.get(bg)
      if (!ink || !ground || unbounded.has(bg)) {
        return { background: bg, foreground: fg, status: 'unverifiable' as const, target }
      }
      const ratio = contrastRatio(fitToGamut(ink), fitToGamut(ground))
      return {
        background: bg,
        foreground: fg,
        ratio,
        status: ratio < target ? ('fail' as const) : ('pass' as const),
        target,
      }
    },
  )

  const violations = pairings
    .filter((p) => p.status === 'fail')
    .map(
      (p) =>
        `${p.foreground} on ${p.background}: ${p.ratio?.toFixed(2)}:1 below target ${p.target}:1`,
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

  /* The brand seed is the *solved* primary rather than the colour handed in,
     and that is what makes the two derivations agree: `helix/styles` builds its
     ramp from the seed, so seeding it with the raw input would leave the CSS
     primary and the engine's primary two different colours on the same page. */
  /* **The chroma policy has to reach the seed, or half the palette never hears
     about it.** The engine applies it to every colour it solves, and the
     twenty-four series colours are not among those: they derive in CSS off the
     seed, so a monotone theme emitted grey buttons and left the charts vivid.
     Measured before this: saturation at 20 per cent, and a bar still painted
     chroma 0.206.

     `ceiling` is an absolute chroma and the seed is a multiplier, so a ceiling
     is folded in against the loudest series the ramp holds, which measured at
     0.277. Approximate by construction and it has to be: the ramp states a
     different chroma per hue because sRGB is not chroma-uniform, and one
     multiplier cannot honour eight ceilings exactly. What it does honour is the
     direction and the extremes, so a ceiling of 0 gives grey charts. */
  const LOUDEST_SERIES = 0.277
  const chromaCeiling = resolved.chroma.ceiling
  const chromaScale = resolved.chroma.scale ?? 1
  const seriesScale =
    chromaCeiling === undefined
      ? chromaScale
      : Math.min(chromaScale, chromaCeiling / LOUDEST_SERIES)

  const seeds: Record<string, string> = {
    'seed-brand': oklchToHex(fitToGamut(primary.raw)),
    'seed-chroma-scale': String(Number(seriesScale.toFixed(3))),
    'seed-density': String(resolved.density),
    'seed-radii': `${resolved.radius}rem`,
  }

  return { collisions, intent: resolved, pairings, seeds, tokens, violations }
}

/**
 * The pairs a theme is checked against, derived from the surface model.
 *
 * **This replaced ten hand-written pairs, which were a claim about ten pairs
 * rather than about a theme.** A tag on a raised card, a hovered filled button,
 * every status fill and the focus ring were all unmeasured, and none of them
 * was ever going to be noticed by reading a list that did not mention them.
 *
 * Derived, so adding a ground to an ink in `model.ts` adds its pairs
 * everywhere at once and there is no second place to remember.
 *
 * `pairings` stays an input: a caller on their own tokens supplies their own
 * surfaces, which is what makes the engine useful to somebody who has never
 * heard of Helix. This is the default rather than the only answer.
 */
export const defaultPairings = (contrastTarget: number): PairingRequest[] =>
  INKS.flatMap((ink) =>
    ink.grounds.map((ground) => ({
      background: ground,
      foreground: ink.name,
      /* A component mark answers to WCAG 1.4.11 at 3:1 rather than to the body
         text target, and pinning it to 3 rather than scaling it with
         `contrastTarget` is deliberate: raising a theme to AAA raises what its
         text must reach, not what the specification asks of a ring. */
      target: ink.contrast === 'component' ? 3 : contrastTarget,
    })),
  )

/**
 * What each character does to the pace and to the curve.
 *
 * **Pace and curve together, because they are one decision.** A spring over
 * 120ms is a twitch and a soft curve over 120ms is a fade, so a character that
 * set the curve and left the duration alone would produce neither of the two
 * things it names.
 *
 * `springy` takes the `spring` easing the stylesheet already ships rather than
 * a bezier pretending to be one: a real overshoot needs more than two control
 * points, which is what `linear()` with a sampled curve is for.
 */
const MOTION = {
  gentle: { curve: 'cubic-bezier(0.4, 0, 0.2, 1)', pace: 1.35 },
  snappy: { curve: 'cubic-bezier(0.3, 0, 0.1, 1)', pace: 0.7 },
  springy: { curve: 'var(--helix-easing-spring)', pace: 1.1 },
} as const

/**
 * The ramp, as steps away from the body size.
 *
 * Negative steps are the UI ramp and go down a pixel each: 12 and 13 sit a
 * pixel apart because a label has to be smaller than its field and still be
 * read, which is a floor rather than a ratio. Positive steps are the display
 * ramp and compound by the scale.
 */
const TEXT_STEPS = { '2xl': 3, '3xl': 4, lg: 1, md: 0, sm: -1, xl: 2, xs: -2 } as const

/** Below this a label stops being small and starts being unreadable. */
const TEXT_FLOOR = 11

/** What each character does to the three weights, which move together. */
const WEIGHTS = {
  light: { medium: 400, regular: 300, semibold: 500 },
  regular: { medium: 500, regular: 400, semibold: 600 },
  strong: { medium: 600, regular: 500, semibold: 700 },
} as const

/** The three durations a pace applies to. `instant` is 0 and is a statement. */
const DURATIONS = { fast: 120, normal: 200, slow: 320 } as const

/**
 * What each mechanism means for an edge.
 *
 * `fill` and `space` both come out as no edge and no lift, which is not a bug:
 * the difference between them lives in the surface colours and in `density`.
 */
const EDGE = { border: '1px', fill: '0', shadow: '0', space: '0' } as const

/* Stated rather than referenced, because the emitted file has to stand on its
   own: a consumer who takes the block and not the stylesheet still gets a
   lift. */
const SHADOW_IN_FLOW = '0 4px 12px color-mix(in oklab, oklch(0.13 0 0) 10%, transparent)'
const SHADOW_FLOATING = '0 12px 32px color-mix(in oklab, oklch(0.13 0 0) 14%, transparent)'

/**
 * Renders a derived theme as a CSS custom-property block.
 *
 * **The seeds are emitted beside the tokens, and that is what stops the two
 * derivations disagreeing.** `helix/styles` derives a ramp of its own from
 * `--helix-seed-*`, including the twenty-four series colours a chart reads, and
 * nothing here reaches those. Emitting the tokens alone moved the buttons, the
 * tags and the surfaces and left every chart on the page the original blue,
 * which the marketing site worked around by writing the seed itself.
 * `check:seeds` holds the two name sets to each other now, in both directions.
 */
export const toCss = (theme: DerivedTheme, selector = ':root'): string => {
  const { namespace } = theme.intent
  const lines = theme.tokens.map((t) => `  --${namespace}-${t.name}: ${t.hex};`)

  for (const [name, value] of Object.entries(theme.seeds)) {
    lines.push(`  --${namespace}-${name}: ${value};`)
  }

  /* **The separation policy, which is what makes the knob turn.** The audit
     that produced these tokens put every surface's edge and lift behind a hook
     defaulting to one of them, so a single declaration here reaches thirteen
     surfaces. Emitted only when asked for: an omitted policy leaves the
     stylesheet's own defaults standing, which are border-first in the flow and
     shadow-first over content. */
  const { floating, surface } = theme.intent.separation
  if (surface) {
    lines.push(`  --${namespace}-border-surface: ${EDGE[surface]};`)
    lines.push(
      `  --${namespace}-shadow-surface: ${surface === 'shadow' ? SHADOW_IN_FLOW : 'none'};`,
    )
  }
  if (floating) {
    lines.push(`  --${namespace}-border-floating: ${EDGE[floating]};`)
    lines.push(
      `  --${namespace}-shadow-floating: ${floating === 'shadow' ? SHADOW_FLOATING : 'none'};`,
    )
  }

  /* **Families are emitted and the rest of the type system is not**, which is
     the honest half of this: a consumer picks faces, where the size scale, the
     weights, the leading and the tracking are a system rather than a choice.
     Emitted only when asked for, so an omitted face leaves the stylesheet's
     own stack standing rather than being replaced by a repeat of it. */
  /* **`font-sans`, which is the name the stylesheet reads.** This emitted
     `font-body` and nothing consumed it, so setting a body face changed the
     headings, which take `font-display`, and left every other word on the page
     alone. The intent field stays `body`, that being what a consumer means; the
     token is what the token layer calls it, which is the same direction the
     `foreground-on-accent` rename went. */
  const { body, display, mono } = theme.intent.font
  if (body ?? display ?? mono) {
    /* **The block names the faces and does not fetch them**, which is the line
       between a preview and an artifact. A builder trying a face on may reach
       for whatever host has it; a block a consumer pastes into their own
       stylesheet must not thereby acquire a dependency on a host they did not
       pick. So the theme says what it assumes and leaves the loading to whoever
       owns the page. */
    lines.push('  /* Assumes these faces are already loaded. */')
  }
  if (body) {
    lines.push(`  --${namespace}-font-sans: ${body};`)
  }
  if (display ?? body) {
    lines.push(`  --${namespace}-font-display: ${display ?? body};`)
  }
  if (mono) {
    lines.push(`  --${namespace}-font-mono: ${mono};`)
  }

  /* Emitted only where asked for, so a theme that says nothing about motion
     leaves the stylesheet's own pace and curves standing. */
  const { character, scale: pace } = theme.intent.motion
  if (character || pace !== undefined) {
    const multiplier = (character ? MOTION[character].pace : 1) * (pace ?? 1)
    for (const [step, ms] of Object.entries(DURATIONS)) {
      lines.push(`  --${namespace}-duration-${step}: ${Math.round(ms * multiplier)}ms;`)
    }
  }
  if (character) {
    lines.push(`  --${namespace}-easing-standard: ${MOTION[character].curve};`)
  }

  /* The ramp, emitted only where a base or a ratio was asked for, so a theme
     that says nothing about size leaves the hand-picked scale standing rather
     than replacing it with a generated one that rounds differently. */
  const { base, scale: ratio, weight } = theme.intent.font
  if (base !== undefined || ratio !== undefined) {
    const body = base ?? 14
    const step = ratio ?? 1.32

    /* **Compounded from the rounded step, not from the base.** A designer builds
       a scale by taking the last round number and multiplying it, which is why
       real ramps are whole pixels the whole way up; compounding from the base
       and rounding once at the end produces a run that is a pixel off itself in
       the middle. Measured at 1.32: 18, 24, 32, 42 from the rounded chain
       against 19, 25, 33, 44 from the base.

       **The shipped ramp is hand-picked and no single ratio reproduces it.** Its
       steps run 1.29, 1.33, 1.33, 1.375, so the top one is wider than the rest.
       1.32 matches four of the seven exactly and lands 42 where the stylesheet
       has 44, which is why nothing is emitted unless a base or a ratio is asked
       for: asking gives a generated ramp rather than a copy of the one that
       ships. */
    const above: number[] = []
    for (let index = 0; index < 4; index += 1) {
      above.push(Math.round((above[index - 1] ?? body) * step))
    }

    for (const [name, distance] of Object.entries(TEXT_STEPS)) {
      const px =
        distance < 0 ? Math.max(TEXT_FLOOR, body + distance) : (above[distance - 1] ?? body)
      lines.push(`  --${namespace}-text-${name}: ${px / 16}rem;`)
    }
  }
  if (weight) {
    for (const [name, value] of Object.entries(WEIGHTS[weight])) {
      lines.push(`  --${namespace}-weight-${name}: ${value};`)
    }
  }

  const { blur, opacity } = theme.intent.material
  if (blur !== undefined) {
    lines.push(`  --${namespace}-material-backdrop: ${blur === 0 ? 'none' : `blur(${blur}px)`};`)
  }
  if (opacity !== undefined) {
    lines.push(
      `  --${namespace}-material-translucent: color-mix(in oklab, ` +
        `var(--${namespace}-color-surface) ${Math.round(opacity * 100)}%, transparent);`,
    )
    /* **The scalar as well as the colour**, because the two halves of material
       reach different things. The colour is what a translucent *surface* is
       filled with; the scalar is what every wash drawn at its own strength gets
       multiplied by, which is how a chart's area and a faded group follow the
       same policy as a glass header. Emitting one and not the other left the
       flat half of the language behind. */
    lines.push(`  --${namespace}-material-opacity: ${Number(opacity.toFixed(3))};`)
  }

  return `${selector} {\n${lines.join('\n')}\n}\n`
}
