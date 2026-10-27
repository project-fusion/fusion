/* The root on a phone: `HelixAppRoot`, which sends each press on a Helix
   link to a route through the router, with your theme, Helix's icons, and the
   status bar. */
import { HelixAppRoot } from '@fusion.dev/helix/expo-router'
import * as icons from '@fusion.dev/helix-icons'
import { glyphs } from '@fusion.dev/helix-native'
import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import helix from '../helix.json'

type Icon = { readonly content: string; readonly viewBox: string }

/** A Helix icon by its web name, `caret-end` as `caretEnd`. */
const named = (name: string): Icon | undefined =>
  (icons as unknown as Readonly<Record<string, Icon | undefined>>)[
    name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
  ]

const Glyph = glyphs(named)

/* The theme in `helix.json`. A development build derives the colors from it
   on the phone. Expo Go draws Helix's own colors. */
export function Root({ children }: { readonly children?: ReactNode }) {
  return (
    <HelixAppRoot Glyph={Glyph} seeds={helix.theme}>
      <StatusBar style="auto" />
      {children}
    </HelixAppRoot>
  )
}
