/**
 * Helix diagnostics on the web, which `root.web.tsx` loads in development
 * only.
 *
 * It finds the Helix mistakes that are valid CSS and therefore silent, such as
 * an attribute value outside the set a component takes. Each finding prints
 * once in DevTools, and a badge in the corner of the page lists them.
 *
 * To print the findings in your terminal as well, run `npm run diagnostics`
 * beside the dev server, and add `sinks: { relay: true }` below.
 */
import { initDiagnostics } from '@fusion.dev/helix-diagnostics'
import lint from '@fusion.dev/helix/lint.json'

initDiagnostics({
  environment: 'development',
  page: () => window.location.pathname,
  tiers: [{ lint }],
})
