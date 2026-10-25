import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react'
import { carryIntoLayers } from '../render/carry'
import { ROOT } from './drawn'

/** What a glyph is drawn with. */
export interface GlyphProps {
  /** The color it is drawn in. */
  readonly color: string
  /** The glyph's name, such as `x` or `caret-end`, as an icon is named on the web. */
  readonly name: string
  /** How wide and tall it is, in points. */
  readonly size: number
}

/** One mode of a theme, as the elements draw with it. */
export interface Theme {
  /** A component that draws a named glyph. Without it, a glyph is left out. */
  readonly Glyph?: ComponentType<GlyphProps>
  /**
   * The mode the tokens are for, which picks a style's `scheme()` value, as
   * `light-dark()` does on the web. Light where it is not given.
   */
  readonly mode?: 'dark' | 'light'
  /**
   * The points a `rem` is in a font size, a line height, and a letter
   * spacing: 16 times the reader's text size. A size of text a family does
   * not set resolves against it too.
   */
  readonly rem: number
  /**
   * The points a `rem` is in every other length, such as a padding, a gap, a
   * corner radius, or a height: 16 times the reader's text size, up to the
   * largest standard size, `SPACE_SCALE_LIMIT`.
   */
  readonly spaceRem: number
  /** The mode's token values, by name after `--helix-`, such as `color-foreground`. */
  readonly tokens: Readonly<Record<string, number | string>>
}

/** What an element draws with where no provider is above it: no tokens, no glyphs, and the default text size. */
const BARE: Theme = { rem: ROOT, spaceRem: ROOT, tokens: {} }

const ThemeContext = createContext<Theme>(BARE)

carryIntoLayers(ThemeContext)

/** What `ThemeProvider` takes: a theme, and the elements that draw with it. */
export interface ThemeProviderProps extends Omit<Theme, 'rem' | 'spaceRem'> {
  /** The elements drawn with the theme. */
  readonly children?: ReactNode
  /** The points a `rem` is in text. 16 where it is not given, which is the default text size. */
  readonly rem?: number
  /** The points a `rem` is in every other length. `rem` where it is not given. */
  readonly spaceRem?: number
}

/**
 * Gives the elements inside it one mode's tokens, the size of a `rem` in text
 * and in every other length, and the component that draws their glyphs.
 * `HelixRoot` and `HelixTheme` provide it.
 */
export const ThemeProvider = ({
  children,
  Glyph,
  mode,
  rem = ROOT,
  spaceRem = rem,
  tokens,
}: ThemeProviderProps) => {
  const theme = useMemo<Theme>(
    () => ({
      ...(Glyph === undefined ? {} : { Glyph }),
      ...(mode === undefined ? {} : { mode }),
      rem,
      spaceRem,
      tokens,
    }),
    [Glyph, mode, rem, spaceRem, tokens],
  )
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/** The theme the nearest `ThemeProvider` gives, or no tokens and no glyphs at the default text size outside one. */
export const useTheme = (): Theme => useContext(ThemeContext)
