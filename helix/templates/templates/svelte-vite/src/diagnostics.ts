/**
 * Helix diagnostics, which `main.ts` loads in development only.
 *
 * It finds the Helix mistakes that are valid CSS and therefore silent, such as
 * a `::part()` naming a part nothing publishes, and an attribute value outside
 * the set a component takes. Each finding prints once in DevTools, and a badge
 * in the corner of the page lists them while there are any.
 *
 * **Checked against the Helix you installed**, from the lint data it ships, so
 * nothing is loaded from the network.
 *
 * To print the findings in your terminal as well, run `npx helix diagnostics`
 * from `@fusion.dev/helix-cli` beside the dev server, and add
 * `sinks: { relay: true }` below.
 */
import { initDiagnostics } from '@fusion.dev/helix-diagnostics'
import lint from '@fusion.dev/helix/lint.json'

initDiagnostics({
  environment: 'development',
  /* The route is in the hash, so each page's findings are kept apart. */
  page: () => window.location.hash.slice(1) || '/',
  tiers: [{ lint }],
})
