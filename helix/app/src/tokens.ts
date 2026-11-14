import type { Tokens } from '@fusion.dev/helix-native'
import { Platform } from 'react-native'

/** A length token in points, as the theme holds it, or 0 where the theme has none. */
export const points = (tokens: Tokens, name: string): number => {
  const value = tokens[name]
  return typeof value === 'number' ? value : 0
}

/** A color token as the theme holds it, in sRGB hex. */
export const color = (tokens: Tokens, name: string): string => String(tokens[name] ?? '')

/** The platform's own monospace font, which the code is set in. */
export const MONOSPACE = Platform.OS === 'android' ? 'monospace' : 'Menlo'
