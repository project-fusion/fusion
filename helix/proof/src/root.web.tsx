/* The root on the web: Helix's stylesheet, the page's own frame, and
   `HelixAppRoot`, which follows each press on a link to a route with the
   router. A stylesheet is the web's alone, so it is imported here.

   Helix's stylesheet is imported as its four files, in the order they load.
   `@fusion.dev/helix-styles/helix.css` imports the same four, and Metro's
   development server leaves out what a stylesheet imports. */
import '@fusion.dev/helix-styles/primitives.css'
import '@fusion.dev/helix-styles/tokens.css'
import '@fusion.dev/helix-styles/base.css'
import '@fusion.dev/helix-styles/elements.css'
import './web.css'
import { HelixAppRoot } from '@fusion.dev/helix/expo-router'
import type { ReactNode } from 'react'

export function Root({ children }: { readonly children?: ReactNode }) {
  return <HelixAppRoot>{children}</HelixAppRoot>
}
