/**
 * Helix diagnostics, which `instrumentation-client.ts` loads in development only.
 *
 * It finds the Helix mistakes that are valid CSS and therefore silent, such as
 * a `::part()` naming a part nothing publishes, and an attribute value outside
 * the set a component takes. Each finding prints once in DevTools, and a badge
 * in the corner of the page lists them while there are any.
 *
 * **Checked against the Helix you installed**, from the lint data it ships, so
 * nothing is loaded from the network.
 *
 * To print the findings in your terminal as well, run `npm run diagnostics`
 * beside the dev server, and add `sinks: { relay: true }` below. The script
 * runs `helix diagnostics` from `@fusion.dev/helix-cli`.
 */
import { initDiagnostics } from '@fusion.dev/helix-diagnostics'
import lint from '@fusion.dev/helix/lint.json'

initDiagnostics({ environment: 'development', tiers: [{ lint }] })
