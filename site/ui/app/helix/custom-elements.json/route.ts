import manifest from '@helix-io/styled/custom-elements.json'

/**
 * The custom elements manifest, at a URL.
 *
 * **It was only ever a package path before, on a page that says an agent has
 * this site and no checkout.** `coding-agents.mdx` names the manifest as the
 * first of three machine-readable surfaces and gives its location as
 * `@helix-io/styled/custom-elements.json`, which is a specifier: reachable from a
 * `node_modules` and from nowhere else. An agent that found this site through
 * `llms.txt` had the two surfaces that are documents and not the one that is the
 * vocabulary.
 *
 * Serving it costs a route and closes that, and it is the same file rather than a
 * rendering of it: the published package and this URL are one artifact, so
 * nothing can drift between what a consumer installs and what an agent reads.
 *
 * **Static, and that is what makes it honest.** It is baked at build time from
 * the same manifest the reference pages, the framework typings and the site's own
 * component pages are generated from, so a manifest that disagreed with the pages
 * would have to disagree with itself first.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      /* Immutable is wrong and a year is wrong. The manifest changes with every
         release and an agent asking twice in one session should get one answer,
         so this is the same short window a document gets rather than the long one
         a hashed asset gets. */
      'cache-control': 'public, max-age=300, must-revalidate',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
