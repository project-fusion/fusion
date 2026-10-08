import tokens from '@fusion.dev/helix-styles/tokens.json'

/**
 * The semantic token set, at a URL.
 *
 * **The list has to be reachable without an install.** `@fusion.dev/helix-styles`
 * exports `tokens.json`, so a consumer with a `node_modules` can read every
 * token with its value and category. An agent that arrived through `llms.txt`
 * cannot: the tokens page is prose about the system and names seven.
 *
 * **The same file `helix_tokens` reads.** `helix mcp` answers from the copy a
 * project installs, and this is the copy for an agent with no install.
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
