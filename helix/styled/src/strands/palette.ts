import type { ColorBytes, TokenColor } from '@fusion.dev/helix-core'

/** The colors the ribbon is drawn and composited in, as channels in `0..1`. */
export interface StrandsPalette {
  /** Most strands. */
  glow: TokenColor
  /** The page the light is added to. */
  ground: TokenColor
  /** Whether the ground is light, which turns added light into ink. */
  light: boolean
  /** The hottest strands, and on a light page the ink everything darkens toward. */
  peak: TokenColor
  /** A minority of strands, for depth. */
  tint: TokenColor
}

/** The computed colors the canvas carries, one per stop and two for the peak. */
export type StrandsPaletteStyle = Pick<
  CSSStyleDeclaration,
  'caretColor' | 'color' | 'columnRuleColor' | 'outlineColor' | 'textDecorationColor'
>

/** The default theme's dark page, ink on black, which is drawn until a read. */
export const RESTING_PALETTE: StrandsPalette = {
  glow: [0.88, 0.88, 0.88],
  ground: [0, 0, 0],
  light: false,
  peak: [1, 1, 1],
  tint: [0.6, 0.6, 0.6],
}

/**
 * The palette, from the colors the canvas's stylesheet resolved for it.
 *
 * **Carried on color properties of the canvas, which a canvas never paints**,
 * the way `Aura` carries its ramp: a custom property is handed back as the
 * text that was written, and a color property is resolved by the engine first.
 * Read there, each color takes the `--strands-*` hook a page wrote anywhere
 * above the element, and the token otherwise:
 *
 * - `color`: `--strands-glow`, or `primary`.
 * - `text-decoration-color`: `--strands-tint`, or `accent`.
 * - `outline-color`: `--strands-ground`, or the background.
 * - `caret-color` and `column-rule-color`: `--strands-peak`, or the dark and
 *   the light page's own peak.
 *
 * **The ground says which way the page runs**, read from its luminance rather
 * than asked of the color mode, which is a private token this tier may not
 * reach for. A dark page adds light toward a bright peak; a light page darkens
 * toward a deep one, because light added to near-white is invisible.
 *
 * @param style The canvas's computed style.
 * @param read Turns a resolved color into bytes, `undefined` where it cannot.
 */
export const paletteOf = (
  style: StrandsPaletteStyle,
  read: (value: string) => ColorBytes | undefined,
): StrandsPalette => {
  const channels = (value: string, fallback: TokenColor): TokenColor => {
    const bytes = read(value)
    return bytes ? [bytes[0] / 255, bytes[1] / 255, bytes[2] / 255] : [...fallback]
  }
  const ground = channels(style.outlineColor, RESTING_PALETTE.ground)
  const light = ground[0] * 0.2126 + ground[1] * 0.7152 + ground[2] * 0.0722 > 0.5
  return {
    glow: channels(style.color, RESTING_PALETTE.glow),
    ground,
    light,
    peak: light
      ? channels(style.columnRuleColor, [0.02, 0.02, 0.02])
      : channels(style.caretColor, RESTING_PALETTE.peak),
    tint: channels(style.textDecorationColor, RESTING_PALETTE.tint),
  }
}
