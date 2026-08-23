import { routeSections } from '@/lib/routes'

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

const SITE = 'https://fusion.dev'

export async function GET() {
  const lines = [
    '# Fusion Development Group',
    '',
    '> Intelligence and energy are collapsing in cost at the same moment. Fusion',
    '> builds the stack that makes sovereignty practical: Helix, a design system,',
    '> and Cortex, a cognitive substrate.',
    '',
    'Every page on this site has a sibling `.md` at the same path plus the',
    'extension. The component reference and the design-system documentation are',
    'generated from a custom elements manifest, which is published as part of',
    '`@helix-io/web` and is the authoritative description of every component.',
    '',
  ]

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
