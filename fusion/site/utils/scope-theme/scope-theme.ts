/*
 * A hero's own theme, which its brand and mode controls paint on the element
 * around the drawing: the Maps and Graph pages share it.
 */
import type { DerivedTheme, ThemeIntent } from '@fusion.dev/helix-theme'
import { intentFrom, type Settings } from '@/utils/theme-defaults/theme-defaults'

/**
 * A theme the builder sent, as its settings and the query that carries it
 * back, so the page can say where it came from and return a reader there.
 */
export interface SentTheme {
  query: string
  settings: Settings
}

/**
 * The intent a sent theme describes, in a scheme the page's mode control
 * chooses. **Without its faces**: a map's labels are drawn in the tile
 * server's glyphs whatever the page's type is, and a face the builder loaded
 * from a font service is not loaded here, so naming it would only swap the
 * panel's text to a fallback.
 *
 * Here rather than in a hero because the server derives the first paint from
 * it, and a function exported from a client module is not one a server can
 * call.
 */
export function sentIntent(settings: Settings, scheme: 'dark' | 'light'): ThemeIntent {
  return intentFrom({ ...settings, bodyFace: '', displayFace: '', monoFace: '', scheme })
}

/** A derived theme as the custom properties a scope is painted with. */
export function propertiesOf(
  theme: Pick<DerivedTheme, 'seeds' | 'tokens'>,
): Record<string, string> {
  const properties: Record<string, string> = {}
  for (const token of theme.tokens) {
    properties[`--helix-${token.name}`] = token.hex
  }
  for (const [name, value] of Object.entries(theme.seeds)) {
    properties[`--helix-${name}`] = value
  }
  return properties
}
