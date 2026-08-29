import tokens from '@fusion.dev/helix-styles/tokens.json'

/**
 * The semantic token set, at a URL.
 *
 * **The list has to be reachable without an install.** `@fusion.dev/helix-styles`
 * exports `tokens.json`, so a consumer with a `node_modules` can read all 177
 * with their values and categories. An agent that arrived through `llms.txt`
 * cannot: the tokens page is prose about the system and names seven, and
 * `fusion/docs/token-reference.md` is repository-internal by design, since a
 * reader count is a fact about this repository rather than about Helix.
 *
 * **This is also what keeps the MCP server honest.** Whether a token exists is a
 * closed set and belongs in a file; what a brand color derives to is a function
 * of an input nobody can enumerate, and that is the only thing left that a static
 * surface genuinely cannot answer.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(tokens), {
    headers: {
      'cache-control': 'public, max-age=300, must-revalidate',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
