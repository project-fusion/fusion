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
   * The faces the theme is set in.
   *
   * **Type is part of a theme and had no input at all.** Twenty tokens across
   * five categories, families, sizes, weights, leading and tracking, were
   * unreachable from intent while every colour in the palette was one field
   * away. Families are the half a consumer actually chooses; the size scale,
   * the weights and the spacing are the half that is a system, and they are
   * still fixed.
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
   * How the theme's motion feels.
   *
   * **The other axis with no input at all**, alongside the half of type that is
   * a system: nine tokens, four durations and five curves, and a brand with a
   * snappy voice and one with a gentle one reached them the same way, which is
   * to say not at all.
   *
   * `character` sets the curve every component reaches for by default and
   * carries a duration multiplier with it, because the two are one decision: a
   * spring over 120ms is a twitch and a soft curve over 120ms is a fade. `scale`
   * multiplies on top for a theme that wants the character and not the pace.
   *
   * `instant` is not scaled. It is 0 and means "do not animate", which is a
   * statement rather than a duration.
   */
  motion?: {
    character?: 'gentle' | 'snappy' | 'springy'
    scale?: number
  }
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
    /**
     * How far the statuses follow the palette's own loudness, 0 to 1.
     *
     * **Hue is meaning and loudness is not**, which is the distinction this
     * field turns on. A status that rotates with the brand is a warning a
     * reader re-learns per product, and that stays refused. A status that
     * ignores how loud the palette around it is has a different problem:
     * against a muted brand, danger measured six times the chroma of primary,
     * which is a vivid red screaming on a near-grey page.
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

/** The hue each status carries, in degrees, taken from what already ships. */
export const STATUS_HUE = {
  danger: 27,
  info: 245,
  success: 155,
  warning: 75,
} as const

/**
 * The chroma each status carries, taken from the same shipped primitives.
 *
 * **Per status, because sRGB is not chroma-uniform.** These are not four ways
 * of saying "saturated": each hue holds a different maximum at the lightness a
 * status sits at, which is the same fact `tokens.css` records for the series
 * ramp, where one number for eight hues had three of them silently clipped.
 *
 * They exist at all because the engine was taking the *brand's* chroma for
 * every status. A brand at 0.035 gave a danger at 0.035, which is to say a
 * near-grey error; a magenta brand at 0.257 asked amber for a chroma its hue
 * cannot hold and got 0.115 back after clipping, which is a muddy beige. A
 * status's saturation is part of what it means and is not the brand's to set.
 * The `chroma` policy still scales these, because how loud a palette is remains
 * a theme's decision.
 */
export const STATUS_CHROMA = {
  danger: 0.21,
  info: 0.16,
  success: 0.15,
  warning: 0.185,
} as const

export type StatusName = keyof typeof STATUS_HUE

/** Accepts a hex string or an OKLCH triple and always returns the triple. */
export const toOklch = (color: Color): Oklch =>
  typeof color === 'string' ? hexToOklch(color) : color

/** True when a seed says how it relates rather than what it is. */
export const isRelation = (seed: Seed): seed is Relation =>
  typeof seed === 'object' && seed !== null && 'from' in seed
