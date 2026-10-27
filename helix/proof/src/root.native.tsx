/* The root on a phone: `HelixAppRoot`, which is `HelixRoot` with each Helix
   link to a path opened through the router, drawing the theme's colors and
   icons with Helix's own, and the status bar in the scheme the app is drawn
   in. A `Glyph` and the status bar are a phone's alone, so they are set here.

   The colors are `src/theme.ts`, which `bun run theme` writes from the
   `theme` of `helix.json` beside `src/theme.css`, so a phone draws the web's
   colors with no theme engine, Expo Go included. */
import { HelixAppRoot } from '@fusion.dev/helix/expo-router'
import * as icons from '@fusion.dev/helix-icons'
import { glyphs } from '@fusion.dev/helix-native'
import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import { theme } from './theme'

type Icon = { readonly content: string; readonly viewBox: string }

/** A Helix icon by its web name, `caret-end` as `caretEnd`. */
const named = (name: string): Icon | undefined =>
  (icons as unknown as Readonly<Record<string, Icon | undefined>>)[
    name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
  ]

const Glyph = glyphs(named)

export function Root({ children }: { readonly children?: ReactNode }) {
  return (
    <HelixAppRoot Glyph={Glyph} tokens={theme}>
      <StatusBar style="auto" />
      {children}
    </HelixAppRoot>
  )
}
