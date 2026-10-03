/**
 * The shapes a consumer writes and the shapes they get back.
 *
 * **Declarations only.** The derivation is Rust, reached through WebAssembly, so
 * what a JavaScript consumer needs from this package is the vocabulary rather
 * than the solver. A type is erased at build time, so nothing here is a second
 * implementation of anything: it cannot drift into disagreeing with the engine
 * about an *answer*, only about a *field name*, which is what is compared.
 */

/** A color in OKLCH. Lightness 0 to 1, chroma from 0, hue in degrees. */
export interface Oklch {
  chroma: number
  hue: number
  lightness: number
}

/** A color a consumer supplies. Hex is accepted and converted at the edge. */
export type Color = Oklch | string

/**
 * How a role departs from the role it derives from.
 *
 * Written as a relationship rather than a second color because a literal
 * drifts out of relation the moment anybody rethemes, which is the failure of
 * every palette with two hardcoded colors in it.
 */
export interface Relation {
  /**
   * How far, in degrees, the angle may move to clear a role it cannot be told
   * apart from. 45 by default.
   *
   * **The accent is the role that yields, and that is the whole point of the
   * field.** A status hue carries meaning and a brand is a fact the consumer
   * supplied; an accent is a relationship with no meaning attached, so when two
   * of them collide the accent is the one with nothing to lose. Measured on the
   * shipped blue: the complement lands at 80 degrees, `warning` is amber at 75,
   * and no rotation of `warning` inside any sane allowance clears it, because
   * `danger` and `success` box in every hue it could reach.
   *
   * Set it to 0 to hold the angle exactly and let `collisions` report the
   * result. A pinned accent never moves at all, a color being a fact.
   */
  allowance?: number
  /**
   * Multiplier on the source's chroma. 1 keeps it, below 1 quiets it. An
   * accent louder than the thing it accents is a second primary, so this is
   * capped at 1 rather than trusted.
   */
  chroma?: number
  /**
   * The role this one departs from. Only `brand` today, and the field exists
   * so a third role can relate to the second without a new mechanism.
   */
  from: 'brand'
  /**
   * Degrees around the hue circle. 180 is the complement and is what a second
   * color usually means, 30 is analogous, 120 is a triad.
   */
  rotate: number
}

/** A role takes a color, or says how it relates to one. */
export type Seed = Color | Relation

/**
 * A status role. A color pins it outright; an object nudges its hue within
 * the meaning it already carries.
 *
 * **Never a `Relation`**, which is the asymmetry with `accent` and is
 * deliberate: a `danger` that rotates with the brand is a warning a reader has
 * to re-learn per product.
 */
export type StatusSeed = Color | { hue?: number }

/** One pair to measure, by token name, without the namespace prefix. */
export interface PairingRequest {
  background: string
  foreground: string
  /**
   * The ratio this pair has to reach. Carried per pair rather than taken from
   * the theme, because a focus ring answers to WCAG 1.4.11 at 3:1 while body
   * text answers to `contrastTarget`, and one number cannot be both.
   */
  target: number
}

export interface ThemeIntent {
  /**
   * The second emphasis. A color pins it and the relationship stands aside.
   * Unnamed, it is the brand: a palette with one color has one, and
   * `tone="accent"` draws in it. `{ from: 'brand', rotate: 180 }` asks for the
   * complement.
   */
  accent?: Seed
  /**
   * The page's own color for each scheme. Unset is pure white in light and
   * pure black in dark.
   *
   * Set, the surfaces keep the contrast with it they keep with white or black,
   * the grays take its cast unless `neutral` says otherwise, and every ink is
   * solved against it. A page no ink can reach the contrast target on is
   * refused: black on a light page, and white on a dark one, is the strongest
   * ink there is.
   */
  background?: {
    dark?: Color
    light?: Color
  }
  /**
   * The one color most consumers care about, and the only required input.
   */
  brand: Color
  /**
   * How saturated the palette is, independent of which hue it is.
   *
   * **This is the axis a brand's feel lives on.** Monotone, muted, restrained
   * and vivid are all chroma statements and none of them is a hue. `ceiling`
   * clamps, so 0 is monotone and roughly 0.10 is muted; `scale` multiplies
   * what the brand supplies. Both apply to every derived color including the
   * brand itself, because a monotone theme is one where the brand is gray too.
   *
   * Never applied to a value the consumer pinned. A pinned color is a fact.
   */
  chroma?: {
    ceiling?: number
    scale?: number
  }
  /**
   * The least contrast any text may have. 4.5 is WCAG AA, 7 is AAA. The
   * European Accessibility Act points at WCAG 2.1 AA, so 4.5 is the figure with
   * legal weight and is the default.
   *
   * A floor, which the muted ink is solved to and every other text ink is
   * measured against. Body text, `color-foreground`, is the strongest ink the
   * neutral has whatever the target: black on a light page and white on a dark
   * one, as the shipped stylesheet writes it.
   */
  contrastTarget?: number
  /**
   * Scales spacing and control heights. 1 is default, 0.875 is compact.
   */
  density?: number
  /**
   * Translucency and blur: how much a surface above content admits what is
   * behind it. `blur` is pixels and 0 is flat; `opacity` is 0 to 1.
   *
   * **The one material choice that can invalidate the guarantee.** Contrast is
   * measured against a known ground and a translucent surface does not have
   * one, so a pair over it comes back `unverifiable` rather than measured.
   */
  material?: {
    blur?: number
    opacity?: number
  }
  /**
   * The faces the theme is set in.
   *
   * **Families are the half a consumer chooses**; the size scale, the weights
   * and the spacing are the half that is a system, and they stay fixed.
   *
   * `display` falls back to `body`, which is what the stylesheet already does:
   * a theme with one face is the common case and should not have to say so
   * three times.
   */
  font?: {
    /**
     * Body size in pixels. 14 is what ships.
     *
     * The whole ramp is built from it: the two steps below step down a pixel
     * each and the four above compound by `scale`.
     */
    base?: number
    body?: string
    display?: string
    mono?: string
    /**
     * The ratio between the display steps. Roughly 1.33 is what ships, which is
     * a perfect fourth.
     *
     * **It applies above the body size and not below it**, because the two ends
     * of a type ramp are different problems. The steps under body are a UI
     * ramp, where 12 and 13 sit a pixel apart because a label has to be smaller
     * than its field and still be read; the steps above are a display ramp,
     * where each one has to be obviously not the last. One ratio across both
     * either crushes the top or blows out the bottom.
     */
    scale?: number
    /**
     * How heavy the three weights run. `regular` is 400, 500 and 600, which is
     * what ships; `strong` shifts each up a step and `light` down one.
     *
     * A character rather than three numbers, because the three move together or
     * the relationships between them stop meaning anything.
     */
    weight?: 'light' | 'regular' | 'strong'
  }
  /**
   * The token prefix, without dashes. `helix` by default.
   *
   * **What makes the engine useful to somebody who has never heard of Helix.**
   * With this and `pairings`, a team on their own tokens gets the solver and
   * the verification without adopting the components.
   */
  namespace?: string
  /**
   * How the theme's motion feels: nine tokens, four durations and five curves.
   *
   * `character` sets the curve every component reaches for by default and
   * carries a duration multiplier with it, because the two are one decision: a
   * spring over 120ms is a twitch and a soft curve over 120ms is a fade. `scale`
   * multiplies on top for a theme that wants the character and not the pace.
   *
   * `instant` is not scaled. It is 0 and means "do not animate", which is a
   * statement rather than a duration, and it emits no curves at all: three
   * easings for transitions of zero length is a contradiction.
   *
   * `precise` is the one character that is not physical. The other three
   * accelerate, settle or overshoot; linear reads as moved by a mechanism, and
   * it is the only curve legible on a short travel, because constancy shows in
   * the timing where an overshoot shows in the distance.
   */
  motion?: {
    character?: 'gentle' | 'instant' | 'precise' | 'snappy' | 'springy'
    scale?: number
  }
  /**
   * The cast every gray carries.
   *
   * Chroma 0 is a dead gray and is the default, matching `primitives.css`,
   * which records why: a fixed chroma is a rising *saturation* as a surface
   * darkens, so a trace that looks right on a light page reads navy across a
   * dark one. Where `background` gives the page a color, the default is the
   * page's own cast.
   */
  neutral?: {
    chroma?: number
    hue?: number
  }
  /**
   * How a surface is told apart from what is behind it.
   *
   * **Two policies, because the two kinds of surface are not the same
   * problem.** A card sits in the flow on a ground the theme knows, so how it
   * separates is a style choice. A menu floats over whatever the reader
   * scrolled under it, so its elevation is semantic: it is the thing saying
   * "above".
   *
   * `space` is therefore offered for a surface in the flow and not for a
   * floating one. A floating panel with neither edge nor lift nor fill is
   * unreadable over content nobody can predict, and it is the one failure the
   * engine cannot detect, the ground being unbounded. The type refuses it
   * rather than a comment asking nicely.
   *
   * `fill` and `space` produce the same edge and lift, which is none of
   * either: the difference between them lives in the surface colors and in
   * `density`, not here. Two values with one output reads as a bug and is not.
   */
  separation?: {
    floating?: 'border' | 'fill' | 'shadow'
    surface?: 'border' | 'fill' | 'shadow' | 'space'
  }
  /**
   * Which pairs to measure. Defaults to the surfaces and inks this engine
   * emits. A caller may name their own tokens; anything not emitted comes back
   * `unverifiable` rather than being dropped.
   */
  pairings?: PairingRequest[]
  /**
   * Base corner radius in rem.
   */
  radius?: number
  /**
   * Light or dark surface.
   */
  scheme?: 'dark' | 'light'
  /**
   * Status roles. **Hue is fixed by meaning and everything else derives.**
   *
   * Chroma follows `chroma`, because a vivid red danger inside a monotone
   * theme reads as a bug rather than as a warning. Lightness is solved against
   * `contrastTarget` like any other ink. Only the hue is held, and only
   * because moving it changes what the color means.
   *
   * `allowance` is how far a status may rotate on its own to clear a collision,
   * which is what turns `collisions` from a finding into a repair: a red brand
   * beside a red danger carries no information, and twenty degrees makes the
   * danger crimson without making it not-red.
   *
   * **20 by default, not 0.** A palette that ships reporting a collision it has
   * the means to fix is a palette nobody trusts the report of. A status spends
   * only what it needs, the search stopping at the first hue that clears, and
   * it keeps its own hue entirely when nothing inside the bound works. Set it
   * to 0 to hold every status where convention puts it and read the result off
   * `collisions` instead.
   */
  status?: {
    allowance?: number
    /**
     * How far the statuses follow the palette's own loudness, 0 to 1.
     *
     * **Hue is meaning and loudness is not**, which is the distinction this
     * field turns on. A status that rotates with the brand is a warning a
     * reader re-learns per product, and that stays refused. A status that
     * ignores how loud the palette around it is has a different problem:
     * against a muted brand, danger measured six times the chroma of primary,
     * which is a vivid red screaming on a near-gray page.
     *
     * 0 holds each status at its own chroma. 1 follows the palette as far as the
     * floor allows, and there is a floor: a danger quiet enough to stop reading
     * as danger is worse than a loud one. It never goes above its own chroma
     * either, that already being what its hue can hold.
     */
    harmony?: number
    danger?: StatusSeed
    info?: StatusSeed
    success?: StatusSeed
    warning?: StatusSeed
  }
  /**
   * Values that replace what derivation would have produced, keyed by token
   * name without the namespace prefix. Verified like anything else: a pinned
   * value that misses its target is a violation, not an exception.
   */
  tokens?: Record<string, Color>
}

/** One intent derived in both modes, from `deriveModes`. */
export interface DerivedModes {
  /**
   * One block per selector asked for, each color a `light-dark()` pair. A
   * value that is not a color and differs by mode, such as a floating
   * surface's edge, is set by the rules after the block, for the operating
   * system's dark mode and for `[data-color-mode]` on or inside the selector.
   */
  css: Record<string, string>
  /** The dark theme, with its own findings. Its `css` is empty. */
  dark: DerivedTheme
  /** The light theme, with its own findings. Its `css` is empty. */
  light: DerivedTheme
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
   * Two producers: a pairing naming a token this theme does not emit, which a
   * caller supplying their own `pairings` will legitimately do, and a ground
   * the model marks unbounded, where what sits behind the surface is whatever
   * the reader scrolled under it.
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

/**
 * What a derivation produced.
 *
 * **No resolved `intent` field.** Carrying one across the WebAssembly boundary
 * means a `Serialize` on every shape in the vocabulary, three hand-read unions
 * included, and no consumer has asked for it. It goes back when one does.
 */
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
  /**
   * The emitted block, keyed by the selector it was rendered under. Empty when
   * none were asked for.
   *
   * **Rendered by the same call that derived it**, because a derivation is the
   * expensive half and rendering is not: the theme builder wants one theme under
   * two selectors, and asking twice would derive twice for one keystroke.
   */
  css: Record<string, string>
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
   * halves this engine does not compute: the twenty-four series colors, the
   * spacing scale, the corner radii, and the ramp steps the tokens do not
   * cover. Every seed the stylesheet reads has one, the accent and the neutral
   * cast included, so nothing it derives falls back to its own defaults.
   *
   * **Data rather than only a line of CSS**, because the two consumers apply it
   * differently. `toCss` renders a block; a page theming one panel writes the
   * properties onto that element. Both read this, so neither can hold a
   * different opinion about what the seed is.
   */
  seeds: Record<string, string>
  tokens: DerivedToken[]
  /**
   * Pairings that failed their contrast target, pinned values included.
   * Rendered from `pairings`.
   */
  violations: string[]
}
