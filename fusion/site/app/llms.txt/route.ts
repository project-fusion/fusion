import { routeSections } from '@/content/routes/routes'
import { SITE } from '@/utils/site/site'

/**
 * The index of this site, for a model that wants one file rather than a crawl.
 *
 * Per llmstxt.org: a heading, a summary, and sections of annotated links. Every
 * link points at a `.md`, because the point of the file is to save a reader
 * from rendering anything.
 *
 * **Generated from the route registry**, which is the only arrangement worth
 * having. A hand-written index is a second list of the site's pages, and the
 * second list is always the stale one.
 *
 * There is no `llms-full.txt`. Concatenating every page into one file is a
 * download that is out of date the moment anything changes, where these links
 * are individually cacheable and individually current.
 */
export const dynamic = 'force-static'

export async function GET() {
  const lines = [
    '# Fusion Development Group',
    '',
    '> An intelligent design system, intelligent tooling and intelligent',
    '> services. Fusion builds the foundation underneath: Helix, a design',
    '> system, and Cortex, a memory layer.',
    '',
    'Every page on this site has a sibling `.md` at the same path plus the',
    'extension. The component reference and the design-system documentation are',
    'generated from a custom elements manifest, which is the authoritative',
    'description of every component and is linked below.',
    '',
  ]

  /* **The machine-readable surfaces first, because they are not pages.**
     Everything after this is a document with a sentence about it; these three are
     the vocabulary, and an agent that reads the manifest does not need to be told
     in prose what a component accepts. It went above the sections rather than
     below them for the reason `coding-agents.mdx` gives about starting here
     rather than crawling: the useful order is the cheapest answer first.

     The manifest needs a URL here rather than the specifier
     `@fusion.dev/helix/custom-elements.json`, which is only reachable from a
     `node_modules`, on a site whose own argument is that an agent has this site
     and no checkout. */
  lines.push(
    '## Machine-readable',
    '',
    `- [Custom elements manifest](${SITE}/helix/custom-elements.json): Every tag, property with its literal union, event with its class, slot, part and custom property. The vocabulary: a tag not in it does not exist.`,
    `- [Token set](${SITE}/helix/tokens.json): Every semantic token with its value, category and description. The closed set: a name not in it resolves to nothing and the property silently falls back.`,
    `- [One family as data](${SITE}/helix/components/button.json): Any family's \`.md\` also answers as \`.json\`, the same content structured. Swap the slug.`,
    '',
  )

  for (const { routes, section } of routeSections()) {
    lines.push(`## ${section}`, '')
    for (const route of routes) {
      const summary = route.description ? `: ${route.description}` : ''
      /* The root's document is `/index.md`, because `/.md` is not a path. */
      const document = route.path === '/' ? '/index' : route.path
      lines.push(`- [${route.title}](${SITE}${document}.md)${summary}`)
    }
    lines.push('')
  }

  return new Response(`${lines.join('\n').trimEnd()}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
