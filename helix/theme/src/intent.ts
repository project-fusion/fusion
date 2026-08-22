/**
 * The intent inputs and the shapes they resolve to.
 *
 * Split out of `derive.ts` when the schema stopped being five scalars: the
 * derivation is one function and the vocabulary it takes is a language, and a
 * reader arriving to find out what they may write should not have to read a
 * solver to find out.
 */
import { hexToOklch, type Oklch } from './oklch.js'

/** A colour a consumer supplies. Hex is accepted and converted at the edge. */
export type Color = Oklch | string

/**
 * How a role departs from the role it derives from.
 *
 * Written as a relationship rather than a second colour because a literal
 * drifts out of relation the moment anybody rethemes, which is the failure of
 * every palette with two hardcoded colours in it.
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
   * result. A pinned accent never moves at all, a colour being a fact.
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
   * colour usually means, 30 is analogous, 120 is a triad.
   */
  rotate: number
}

/** A role takes a colour, or says how it relates to one. */
export type Seed = Color | Relation

/**
 * A status role. A colour pins it outright; an object nudges its hue within
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
   * The second emphasis. A colour pins it and the relationship stands aside.
   * Defaults to the complement, `{ from: 'brand', rotate: 180 }`.
   */
  accent?: Seed
  /**
   * The one colour most consumers care about, and the only required input.
   */
  brand: Color
  /**
   * How saturated the palette is, independent of which hue it is.
   *
   * **This is the axis a brand's feel lives on.** Monotone, muted, restrained
   * and vivid are all chroma statements and none of them is a hue. `ceiling`
   * clamps, so 0 is monotone and roughly 0.10 is muted; `scale` multiplies
   * what the brand supplies. Both apply to every derived colour including the
   * brand itself, because a monotone theme is one where the brand is grey too.
   *
   * Never applied to a value the consumer pinned. A pinned colour is a fact.
   */
  chroma?: {
    ceiling?: number
    scale?: number
  }
  /**
   * Target contrast for body text. 4.5 is WCAG AA, 7 is AAA. The European
   * Accessibility Act points at WCAG 2.1 AA, so 4.5 is the figure with legal
   * weight and is the default.
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
   *
   * The audit found this half nearly done already: six declarations across two
   * families, both already behind hooks, so material needed a policy token to
   * default to and nothing else.
   */
  material?: {
    blur?: number
    opacity?: number
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
   * The cast every grey carries.
   *
   * Chroma 0 is a dead grey and is the default, matching `primitives.css`,
   * which records why: a fixed chroma is a rising *saturation* as a surface
   * darkens, so a trace that looks right on a light page reads navy across a
   * dark one. The engine used to hardcode 0.008, the exact value the
   * stylesheet had already rejected for that reason.
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
   * either: the difference between them lives in the surface colours and in
   * `density`, not here. Said out loud because two values with one output
   * looks like a bug until it is explained.
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
   * because moving it changes what the colour means.
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

/** The hue each status carries, in degrees, taken from what already ships. */
export const STATUS_HUE = {
  danger: 27,
  info: 245,
  success: 155,
  warning: 75,
} as const

export type StatusName = keyof typeof STATUS_HUE

/** Accepts a hex string or an OKLCH triple and always returns the triple. */
export const toOklch = (color: Color): Oklch =>
  typeof color === 'string' ? hexToOklch(color) : color

/** True when a seed says how it relates rather than what it is. */
export const isRelation = (seed: Seed): seed is Relation =>
  typeof seed === 'object' && seed !== null && 'from' in seed
