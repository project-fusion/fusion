/* The root on the web: Helix's stylesheet, the page's own frame, and
   `HelixAppRoot`, which follows each press on a link to a route with the
   router. A stylesheet is the web's alone, so it is imported here. */
import '@fusion.dev/helix-styles/helix.css'
import './web.css'
import { HelixAppRoot } from '@fusion.dev/helix/expo-router'
import type { ReactNode } from 'react'

export function Root({ children }: { readonly children?: ReactNode }) {
  return <HelixAppRoot>{children}</HelixAppRoot>
}
