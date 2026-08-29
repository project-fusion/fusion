/**
 * The site's own prose, as MDX with a typed registry.
 *
 * **Prose is written flat, in one file per page, top to bottom.** MDX is here
 * because it is what a writer wants to type, and that is the whole reason.
 *
 * **A page is the file.** No component appears in any of this content, which is
 * what lets `/thesis.md` be the source served verbatim rather than a
 * serialization of something else. A component with children could be added and
 * would still degrade; a childless one would leave a hole, which is what
 * `check:gen:docs` refuses in the two documentation packages and what this package
 * should inherit when it grows one.
 *
 * Shaped like `@fusion.dev/helix-docs` and `@fusion.dev/cortex-docs` deliberately, so a third
 * content package is a thing this repository already knows how to render,
 * check and serve.
 */

export { generatedEssays as essays, generatedPages as sitePages } from './pages.generated'
export { sitePageSources } from './sources.generated'

import { generatedEssays, generatedPages } from './pages.generated'

/**
 * One essay.
 *
 * **Every field is frontmatter.** There is no hand-written registry: a post is
 * one file, its slug is that file's name, and everything a card or a byline
 * needs is at the top of it. `minutes` is the exception, counted from the body
 * rather than typed.
 */
export interface SiteEssay {
  author: string
  date: string
  description: string
  /** Path under `public/`, for a post that has a picture. */
  image?: string
  imageAlt?: string
  /**
   * Where the picture came from, as a note to us rather than to a reader.
   *
   * Nothing renders it. Recorded because the license that made the picture free
   * is a fact about the file, and a year from now the only way to answer
   * whether it can stay is to know where it came from.
   */
  imageCredit?: string
  kind: string
  /** Reading time in minutes, counted from the body at build. */
  minutes: number
  path: string
  /** The URL segment, which is the file's own name. */
  slug: string
  title: string
  topic: string
}

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

/** The page served at a path, if this package holds one. */
export const findSitePage = (path: string): SitePage | undefined =>
  generatedPages.find((page) => page.path === path)

/** The essay of a given slug. */
export const findEssay = (slug: string): SiteEssay | undefined =>
  generatedEssays.find((essay) => essay.slug === slug)

/** Path to a page's MDX, relative to the package root. */
export const sitePagePath = (page: SitePage): string => `content/${page.slug}.mdx`
