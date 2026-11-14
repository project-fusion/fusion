import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react'
import { Platform, useColorScheme, useWindowDimensions } from 'react-native'
import { carryIntoLayers } from '../render/carry'
import { dark } from './dark.generated'
import { drawnTokens, ROOT, scaledTokens, spaceScale, type Tokens } from './drawn'
import { deriveOnDevice, type ThemeSeeds } from './engine'
import { kinds } from './kinds.generated'
import { light } from './light.generated'
import { type GlyphProps, ThemeProvider } from './theme'

/** The modes a theme draws in. */
export type Mode = 'dark' | 'light'

/** A theme's token values for each mode, any of which may be left out. */
export interface ModeTokens {
  readonly dark?: Tokens
  readonly light?: Tokens
}

/** What a subtree draws with, which a theme inside it takes and changes. */
interface Settings {
  readonly Glyph?: ComponentType<GlyphProps>
  /** The mode the subtree draws in, or `undefined` to follow the system's. */
  readonly mode?: Mode
  readonly tokens: Readonly<Record<Mode, Tokens>>
}

/** Helix's own tokens in each mode, following the system's, with no glyphs. */
const SHIPPED: Settings = { tokens: { dark, light } }

const SettingsContext = createContext<Settings>(SHIPPED)

/** What an app's own styles read: the reader's text size, and the values of the mode in use at it. */
interface Read {
  readonly fontScale: number
  readonly values: Tokens
}

const ReadContext = createContext<Read>({
  fontScale: 1,
  values: scaledTokens(light, kinds, 1),
})

/* A layer draws in the mode and with the tokens of the theme around the
   element that opens it. */
carryIntoLayers(SettingsContext)
carryIntoLayers(ReadContext)

/** What `HelixTheme` takes. */
export interface HelixThemeProps {
  readonly children?: ReactNode
  /** Draws a named glyph. Without one, a glyph is left out. */
  readonly Glyph?: ComponentType<GlyphProps>
  /** The mode the elements inside draw in, where it is not the one around them. */
  readonly mode?: Mode
  /**
   * The seeds of the theme's colors, such as `{ brand: '#3b82f6' }`, which
   * the theme engine derives every color from in each mode, on the device.
   * They are what `@fusion.dev/helix-theme` takes on the web, and give the
   * same colors. `tokens` lie over the derived colors.
   *
   * **The engine is a native module, so it needs a development build.** In
   * Expo Go and in Jest the seeds are left unread, and the theme draws the
   * colors around it.
   */
  readonly seeds?: ThemeSeeds
  /**
   * Token values laid over each mode's, by name after `--helix-`, as a theme's
   * custom properties lie over the shipped ones on the web. A length is points,
   * which stay as they are, or a string in rems, such as `'1.25rem'`, which
   * grows with the reader's text size: all the way in a font size, a line
   * height, or a letter spacing, and up to `SPACE_SCALE_LIMIT` in every other
   * length. A time is milliseconds.
   */
  readonly tokens?: ModeTokens
}

/**
 * Gives the elements inside it a theme: a mode, its token values at the
 * reader's text size, and the component that draws glyphs. **A theme inside
 * another takes what it does not change from the one around it**, as
 * `[data-color-mode]` and `[data-helix-theme]` change a subtree on the web,
 * and the outermost one follows the system's color scheme until a mode is
 * given.
 *
 * **With `seeds`, the theme engine derives its colors on the device**, in
 * each mode, as `@fusion.dev/helix-theme` derives them on the web, where the
 * app was built with the engine's native module. Without the module, as in
 * Expo Go, the theme draws Helix's colors, which were derived when the package
 * was built.
 *
 * **A rem is 16 points times the reader's text size**, which React Native
 * reports as the font scale, as a rem on the web is the root font size that a
 * browser's font size setting moves. **Text grows with it all the way, and
 * space stops at the largest standard size**: a font size, a line height, and
 * a letter spacing take the whole text size, and every other length written in
 * rems, such as a padding, a gap, a corner radius, a height, or an icon,
 * stops growing at `SPACE_SCALE_LIMIT`, as iOS's own controls do. A length in
 * points, such as a border, stays. The theme draws again when the setting
 * changes.
 *
 * The renderer reads the values as a stylesheet's, so each length goes to it
 * as written, in rems or as `px`, each time as `ms`, and each font family as
 * the platform names it, and `useTokens` gives an app's own styles the
 * numbers.
 */
export const HelixTheme = ({ children, Glyph, mode, seeds, tokens }: HelixThemeProps) => {
  const around = useContext(SettingsContext)
  const system = useColorScheme()
  const { fontScale } = useWindowDimensions()
  const scale = fontScale > 0 ? fontScale : 1
  /* The same object for the same seeds, so a theme drawn again with a new
     object holding them changes nothing below it. */
  const derived = seeds === undefined ? null : deriveOnDevice(seeds)
  const settings = useMemo<Settings>(() => {
    const drawsWith = Glyph ?? around.Glyph
    const drawsIn = mode ?? around.mode
    return {
      ...(drawsWith === undefined ? {} : { Glyph: drawsWith }),
      ...(drawsIn === undefined ? {} : { mode: drawsIn }),
      tokens: {
        dark: { ...around.tokens.dark, ...derived?.dark, ...tokens?.dark },
        light: { ...around.tokens.light, ...derived?.light, ...tokens?.light },
      },
    }
  }, [around, derived, Glyph, mode, tokens])
  const drawnIn = settings.mode ?? (system === 'dark' ? 'dark' : 'light')
  const written = settings.tokens[drawnIn]
  const read = useMemo<Read>(
    () => ({ fontScale: scale, values: scaledTokens(written, kinds, scale) }),
    [scale, written],
  )
  const drawn = useMemo(
    () => drawnTokens(written, kinds, Platform.OS === 'android' ? 'android' : 'ios'),
    [written],
  )
  return (
    <SettingsContext.Provider value={settings}>
      <ReadContext.Provider value={read}>
        <ThemeProvider
          mode={drawnIn}
          rem={ROOT * scale}
          spaceRem={ROOT * spaceScale(scale)}
          tokens={drawn}
          {...(settings.Glyph ? { Glyph: settings.Glyph } : {})}
        >
          {children}
        </ThemeProvider>
      </ReadContext.Provider>
    </SettingsContext.Provider>
  )
}

/**
 * The token values of the mode the nearest `HelixTheme` draws in, at the
 * reader's text size, by name after `--helix-`, for an app's own styles: a
 * color as hex, a length in points, and a time in milliseconds. A text size,
 * a line height, or a letter spacing written in rems (`text-*`, `leading-*`,
 * `tracking-*`) is 16 points times the text size. Every other length written
 * in rems is 16 points times the text size up to `SPACE_SCALE_LIMIT`, and
 * stays there at the larger sizes. One with ems in it stays a string for the
 * font size where it lands to resolve. Outside a theme, Helix's light values
 * at the default text size.
 *
 * **A size from here is already scaled.** A `Text` of your own that takes one
 * sets `allowFontScaling={false}`, as the text Helix draws does, or React
 * Native scales it a second time.
 */
export const useTokens = (): Tokens => useContext(ReadContext).values

/**
 * The reader's text size that the nearest `HelixTheme` draws at, as a
 * multiple of the default: 1 at the default, and 3.571 at the largest of
 * iOS's accessibility sizes. Outside a theme, 1.
 */
export const useFontScale = (): number => useContext(ReadContext).fontScale
