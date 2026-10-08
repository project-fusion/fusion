import api from '@fusion.dev/helix/api.json'

/**
 * The styled tier's catalog, at a URL: every family with its elements, their
 * properties, events with React props, slots, parts, hooks, states, words, and
 * the import lines, without the examples.
 *
 * **The same file the package ships**, which `helix mcp` reads from a
 * project's `node_modules`. An agent with no install reads it here, and both
 * read what `analyze` wrote from the catalog the family pages come from. It is
 * about a third of the manifest, which repeats every inherited member on every
 * class.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(api), {
    headers: {
      'cache-control': 'public, max-age=300, must-revalidate',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
