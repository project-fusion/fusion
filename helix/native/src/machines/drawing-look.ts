/**
 * What a GPU drawing reads off the part it draws in, as the web's scripts
 * read it off their canvas: the five colors carried on color properties a
 * canvas never paints, and the fade its hook sets. Aura and Strands carry
 * their colors the same way.
 */
import type { ColorBytes } from '@fusion.dev/helix-core'
import type { DrawingLook } from '../render/behavior'
import { colorBytes } from './orb'

/** The five colors a drawing's part carries, by the properties the web's `getComputedStyle` reads. */
export interface CarriedColors {
  readonly caretColor: string
  readonly color: string
  readonly columnRuleColor: string
  readonly outlineColor: string
  readonly textDecorationColor: string
}

/** The colors the part carries, its text's and its box's, as words. */
export const carriedColors = (look: DrawingLook): CarriedColors => {
  const box = (look.box ?? {}) as Readonly<Record<string, unknown>>
  const text = look.text as Readonly<Record<string, unknown>>
  const words = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    caretColor: words(box.caretColor),
    color: words(text.color),
    columnRuleColor: words(box.columnRuleColor),
    outlineColor: words(box.outlineColor),
    textDecorationColor: words(text.textDecorationColor),
  }
}

/** A carried color as bytes, `undefined` where none is carried. */
export const bytesOf = (value: string): ColorBytes | undefined => {
  if (value === '') {
    return undefined
  }
  const [red, green, blue] = colorBytes(value)
  return [red, green, blue]
}

/** The share a fade hook sets, such as `--aura-fade`, `otherwise` where it sets none. */
export const fadeOf = (look: DrawingLook, hook: string, otherwise: number): number => {
  const written = String(look.custom[hook] ?? '').trim()
  const share = Number.parseFloat(written)
  if (!Number.isFinite(share)) {
    return otherwise
  }
  return Math.min(0.5, Math.max(0, written.endsWith('%') ? share / 100 : share))
}

/** A color of channels from `0` to `1`, as words. */
export const rgbOf = (color: readonly number[], alpha = 1): string =>
  `rgba(${color.map((channel) => Math.round(channel * 255)).join(',')},${alpha})`
