/*
 * How text inherits on a phone, as CSS inherits it on the web: the page's
 * own text, and each layer laid over the text around it.
 */
import { length } from '../style/apply'
import type { Style } from '../style/resolved'
import type { Theme } from '../theme/theme'

/**
 * The page's text, which Helix's base layer gives a web page's `body`: its
 * color, family, weight, size, and line height. **Words no family sizes are
 * drawn at the page's size**, as a panel's words are on the web, and so grow
 * with the reader's text size as every other text does.
 */
export const pageText = ({ rem, tokens }: Pick<Theme, 'rem' | 'tokens'>): Style => {
  const out: Record<string, number | string> = {}
  const foreground = tokens['color-foreground']
  if (foreground !== undefined) {
    out.color = foreground
  }
  const family = tokens['font-sans']
  if (typeof family === 'string') {
    out.fontFamily = family
  }
  const weight = tokens['weight-regular']
  if (weight !== undefined) {
    out.fontWeight = String(weight)
  }
  const size = length(tokens['text-md'], rem, rem)
  const leading = tokens['leading-normal']
  if (typeof size === 'number') {
    out.fontSize = size
    if (typeof leading === 'number') {
      out.lineHeight = Math.round(leading * size * 100) / 100
    }
  }
  return out
}

/**
 * Text styles laid over the one around them, in order, as CSS inherits text.
 *
 * **A line height inherits as a multiple of the size**, as the page's
 * `leading-normal` does on the web, so a layer that sets a font size and no
 * line height keeps the multiple it inherits, at its own size.
 */
export const inherit = (around: Style, ...layers: readonly Style[]): Style => {
  let text: Style = around
  for (const layer of layers) {
    const { fontSize, lineHeight } = text
    const next: Record<string, number | string> = { ...text, ...layer }
    if (
      layer.lineHeight === undefined &&
      typeof layer.fontSize === 'number' &&
      typeof fontSize === 'number' &&
      typeof lineHeight === 'number' &&
      fontSize > 0
    ) {
      next.lineHeight = Math.round(((lineHeight * layer.fontSize) / fontSize) * 100) / 100
    }
    text = next
  }
  return text
}
