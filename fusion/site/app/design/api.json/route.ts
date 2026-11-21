import { getFamilies } from '../../../content/catalog/catalog'

/**
 * The styled tier's catalog, at a URL: every family with its elements, their
 * properties, events with React props, slots, parts, hooks, states, words, and
 * the import lines, without the examples.
 *
 * **What `helix mcp` reads from a project that installs every documented
 * package**, built from the catalog the family pages come from. Each package's
 * own `api.json` lists only its own elements, so this is the styled tier's
 * families with what each add-on adds to them: the Sandbox family holds
 * `helix-sandbox-editor` from `@fusion.dev/helix-sandbox` beside the shell,
 * with its own import line, as `helix api family sandbox` answers it there. It
 * is about a third of the manifest, which repeats every inherited member on
 * every class.
 */
export const dynamic = 'force-static'

export function GET() {
  const families = getFamilies()
    .map(({ examples: _, ...family }) => ({
      ...family,
      elements: family.elements.filter((element) => element.tier === 'styled'),
    }))
    .filter((family) => family.elements.length > 0)
  return new Response(JSON.stringify({ families, package: '@fusion.dev/helix' }), {
    headers: {
      'cache-control': 'public, max-age=300, must-revalidate',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
