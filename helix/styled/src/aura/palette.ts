import type { ColorBytes, TokenColor } from '@fusion.dev/helix-core'

/** The four ramp stops a shape is drawn through, as channels in `0..1`. */
export interface AuraPalette {
  glow: TokenColor
  ground: TokenColor
  haze: TokenColor
  peak: TokenColor
}

/** The computed colors the canvas carries, one per stop and two for the peak. */
export type PaletteStyle = Pick<
  CSSStyleDeclaration,
  'caretColor' | 'color' | 'columnRuleColor' | 'outlineColor' | 'textDecorationColor'
>

/** The default theme's dark page, ink on black, which is drawn until a read. */
export const RESTING_PALETTE: AuraPalette = {
  glow: [0.88, 0.88, 0.88],
  ground: [0, 0, 0],
  haze: [0.16, 0.16, 0.16],
  peak: [1, 1, 1],
}

/**
 * The ramp, from the colors the canvas's stylesheet resolved for it.
 *
 * **Carried on color properties of the canvas, which a canvas never paints**,
 * because a custom property is handed back as the text that was written and a
 * color property is resolved by the engine first. Read there, each stop takes
 * the `--aura-*` hook a page wrote anywhere above the aura, and the token
 * otherwise, the same way the fallback gradient on the host does:
 *
 * - `color`: `--aura-glow`, or `primary`.
 * - `text-decoration-color`: `--aura-haze`, or `primary-subtle`.
 * - `outline-color`: `--aura-ground`, or the background.
 * - `column-rule-color` and `caret-color`: `--aura-peak`, or the light and the
 *   dark page's own peak.
 *
 * **Light pages peak on the pressed `primary-active` and dark ones on the
 * foreground**, and the ground is what says which: mixing a saturated hue
 * toward near-black takes the chroma out of exactly the pixels carrying the
 * most of it. Read from the ground's own luminance rather than asked of the
 * color mode, which is a private token this tier may not reach for. A page
 * that sets `--aura-peak` sets both, so its peak is used either way.
 *
 * @param style The canvas's computed style.
 * @param read Turns a resolved color into bytes, `undefined` where it cannot.
 */
export const paletteOf = (
  style: PaletteStyle,
  read: (value: string) => ColorBytes | undefined,
): AuraPalette => {
  const channels = (value: string, fallback: TokenColor): TokenColor => {
    const bytes = read(value)
    return bytes ? [bytes[0] / 255, bytes[1] / 255, bytes[2] / 255] : [...fallback]
  }
  const ground = channels(style.outlineColor, RESTING_PALETTE.ground)
  const light = ground[0] * 0.2126 + ground[1] * 0.7152 + ground[2] * 0.0722 > 0.5
  return {
    glow: channels(style.color, RESTING_PALETTE.glow),
    ground,
    haze: channels(style.textDecorationColor, RESTING_PALETTE.haze),
    peak: light
      ? channels(style.columnRuleColor, [0.02, 0.02, 0.02])
      : channels(style.caretColor, RESTING_PALETTE.peak),
  }
}
