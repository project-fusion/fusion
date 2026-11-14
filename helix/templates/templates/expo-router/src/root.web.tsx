/* The root on the web: Helix's stylesheet, your theme, the page's frame, and
   `HelixAppRoot`, which sends each press on a link to a route through the
   router. */
/* Helix's stylesheet as its four files, in the order they load.
   `@fusion.dev/helix-styles/helix.css` imports the same four, and Metro's
   development server leaves out what a stylesheet imports. */
import '@fusion.dev/helix-styles/primitives.css'
import '@fusion.dev/helix-styles/tokens.css'
import '@fusion.dev/helix-styles/base.css'
import '@fusion.dev/helix-styles/elements.css'
/* The theme in `helix.json`, which `npm run theme` writes here. After Helix's
   stylesheet, so its tokens win. */
import './theme.css'
import './web.css'
import { HelixAppRoot } from '@fusion.dev/helix/expo-router'
import type { ReactNode } from 'react'

/* Helix diagnostics in development, and none of it in an export. */
if (__DEV__) {
  void import('./diagnostics')
}

export function Root({ children }: { readonly children?: ReactNode }) {
  return <HelixAppRoot>{children}</HelixAppRoot>
}
