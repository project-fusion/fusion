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
  /**
   * A registry whose contents belong in this page's document but not in its
   * prose.
   *
   * `/services` is the case and the only one so far. The three offers are
   * structured data with a price, a duration and an includes list, read by this
   * page and by the landing page, so they stay in `services.ts` where several
   * consumers already find them. Writing them into the MDX would be a second
   * copy of a price list, which is the worst possible thing to have two of.
   *
   * So the document is the file plus the registry, which is not a third way of
   * producing markdown: it is the two that already exist, one after the other.
   */
  appends?: 'services'
  /** One-line summary, for the route registry and the document's frontmatter. */
  description: string
  /** The small line above the title, where the page has one. */
  kicker?: string
  /**
   * The paragraph under the title, where the page shows one before its body.
   *
   * In frontmatter rather than as the body's first paragraph, because this
   * page puts its offers between the two and a document cannot be rendered
   * into two places.
   */
  lede?: string
  /** Path as served, with a leading slash. */
  path: string
  /** File name without its extension. */
  slug: string
  title: string
}

/**
 * The pages of the site whose prose lives here.
 *
 * **The six essays are not in this list, and their sources are.** Their
 * metadata already has a home in `site/ui/lib/insights`, which carries what a
 * card needs and crosses into the client bundle so the gallery can filter;
 * repeating a title here would be a second copy of it. What this package owns
 * for an essay is the words, which is what `sitePageSources` is keyed by slug
 * for.
 */
export const sitePages: SitePage[] = [
  {
    description: 'Sovereignty at every scale, and the mechanism that makes it practical.',
    kicker: 'Thesis',
    path: '/thesis',
    slug: 'thesis',
    title: 'Sovereignty is the goal. Abundance is the mechanism.',
  },
  {
    appends: 'services',
    description: 'What we take on, and what it costs.',
    kicker: 'Services',
    lede: 'Everything else on this site is being built. This is the work we take on now: interface and intelligence work the substrates make faster to do well. Three offers, in the order they usually happen. Most start with the audit, which is two weeks at a fixed price, and the rest is scoped from what it finds.',
    path: '/services',
    slug: 'services',
    title: 'The part of this you can buy today',
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
