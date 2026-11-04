/**
 * The icons `HelixRoot` draws a component's glyphs with, from SVG markup and a
 * view box, through `react-native-svg`.
 */

import type { ComponentType } from 'react'
import { useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { paintedMarkup } from './icon-paint'
import { svg } from './vector'

/** An icon as data: the inner markup of an SVG, and the box it is drawn in. */
export interface Icon {
  readonly content: string
  readonly viewBox: string
}

/**
 * A `Glyph` for `HelixRoot` that draws icons by their names, such as
 * `@fusion.dev/helix-icons`'s, in the color and at the size a component
 * asks for. Each icon's own strokes and fills are kept, with a `var()` they
 * name read from the theme, and what it does not paint is drawn in the color. `named` finds an icon by the name a component
 * gives, such as `caret-end`. A name it finds nothing for draws nothing.
 *
 * ```tsx
 * import * as icons from '@fusion.dev/helix-icons'
 *
 * const Glyph = glyphs((name) => icons[camelCase(name)])
 *
 * <HelixRoot Glyph={Glyph}>
 * ```
 */
export const glyphs = (named: (name: string) => Icon | undefined): ComponentType<GlyphProps> => {
  const drawing = ({ color, name, size }: GlyphProps) => {
    const tokens = useTokens()
    const icon = named(name)
    if (icon === undefined) {
      return null
    }
    const { SvgXml } = svg()
    const content = paintedMarkup(icon.content, tokens, color)
    return (
      <SvgXml
        color={color}
        height={size}
        width={size}
        xml={`<svg viewBox="${icon.viewBox}" fill="currentColor">${content}</svg>`}
      />
    )
  }
  return Object.assign(drawing, { displayName: 'Glyph' })
}
