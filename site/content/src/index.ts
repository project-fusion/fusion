/**
 * The site's own prose, as MDX with a typed registry.
 *
 * **Prose is written flat, in one file per page, top to bottom.** It used to be
 * a `PageCopy` object of titles and body arrays, which reads as data and writes
 * as neither: `thesis.ts` carried a 358 character unbroken line, so an edit
 * anywhere rewrote the whole line in the diff, and `trust.ts` had to switch
 * quote style because one sentence contains an apostrophe. Before that it was
 * JSX, which asks for a `<p>` around every paragraph.
 *
 * MDX is here because it is what a writer wants to type. That is the whole
 * reason, and it is a better one than the rendering argument that first put
 * these files in this shape.
 *
 * **A page is the file.** No component appears in any of this content, which is
 * what lets `/thesis.md` be the source served verbatim rather than a
 * serialization of something else. A component with children could be added and
 * would still degrade; a childless one would leave a hole, which is what
 * `check:docs` refuses in the two documentation packages and what this package
 * should inherit when it grows one.
 *
 * Shaped like `@helix-io/docs` and `@cortex-io/docs` deliberately, so a third
 * content package is a thing this repository already knows how to render,
 * check and serve.
 */

export { sitePageSources } from './sources.generated'

export interface SitePage {
  /** One-line summary, for the route registry and the document's frontmatter. */
  description: string
  /** The small line above the title, where the page has one. */
  kicker?: string
  /** Path as served, with a leading slash. */
  path: string
  /** File name without its extension. */
  slug: string
  title: string
}

/** Every page whose prose lives in this package. */
export const sitePages: SitePage[] = [
  {
    description: 'Sovereignty at every scale, and the mechanism that makes it practical.',
    kicker: 'Thesis',
    path: '/thesis',
    slug: 'thesis',
    title: 'Sovereignty is the goal. Abundance is the mechanism.',
  },
  {
    description:
      'The finite checklist every Fusion product clears before it ships, and an honest account of what has been tested so far.',
    kicker: 'Trust',
    path: '/trust',
    slug: 'trust',
    title: 'What has to be true before anything ships',
  },
]

/** The page served at a path, if this package holds one. */
export const findSitePage = (path: string): SitePage | undefined =>
  sitePages.find((page) => page.path === path)

/** Path to a page's MDX, relative to the package root. */
export const sitePagePath = (page: SitePage): string => `content/${page.slug}.mdx`
