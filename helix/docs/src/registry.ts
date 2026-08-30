/**
 * Documentation registry for Helix.
 *
 * Docs are a package rather than a folder inside a site so that the docs are
 * pinned to the version of the code they describe. A site renders this
 * registry; it does not own it.
 *
 * **There is no version axis in here.** The package version is the version:
 * `@fusion.dev/helix-docs@0.2.0` documents Helix 0.2.0, because every package in a
 * domain moves in lockstep. A `versions` array beside that would be a second
 * source of truth with nothing keeping the two in step, and the first time they
 * disagreed the registry would win over the package that shipped it.
 *
 * A site serving several versions installs several versions, which is the
 * mechanism npm already provides and the only one that cannot drift.
 *
 * **Nothing about a page is written here.** `pages.generated.ts` is derived
 * from each file's frontmatter by `turbo run docs`, because the frontmatter is
 * what a `.md` consumer receives and a second copy would be a second source of
 * truth. This module is the types and the reading of them; `sections.ts` is the
 * spine that frontmatter has nowhere to live.
 */
import { docPages } from './pages.generated.js'
import { type DocSection, docSections } from './sections.js'

export interface DocPage {
  /** One-line summary, used for nav tooltips and search results. */
  description: string
  /**
   * Position within a section that is a path.
   *
   * Absent everywhere else, where the order is pinned-entry-first and then
   * alphabetical rather than something an author states.
   */
  order?: number
  /**
   * Slug of the page this one sits under, for the one level of nesting that
   * exists. Installation and Coding agents are the cases.
   */
  parent?: string
  /**
   * Whether this is its section's entry page, which sorts first and exempts
   * itself from the alphabetical rule. At most one per section.
   */
  pinned?: boolean
  /** Title of the `DocSection` this belongs to. */
  section: string
  /** Path segment, unique across the package. */
  slug: string
  title: string
  /**
   * Whether this page is the general answer rather than a named one.
   *
   * The mirror of `pinned`: that sorts a section's entry page first, this sorts
   * a catch-all after the specific pages it is the alternative to. Installation
   * is the case. Angular, React, Svelte and Vue are lookups and belong in the
   * alphabet a reader scans; Other frameworks and Without a bundler answer
   * "none of the above" and read as nonsense in the middle of it, which is
   * where the alphabet was putting Other frameworks.
   *
   * Trailing pages stay alphabetical among themselves, so this states a rank
   * and never a position.
   */
  trailing?: boolean
}

/** One section of the sidebar, with the pages under it in render order. */
export interface DocNavSection extends DocSection {
  pages: DocNavPage[]
}

/** A page in the sidebar, with any children beneath it. */
export interface DocNavPage extends DocPage {
  children: DocPage[]
}

export type { DocSection }
export { docPages as pages, docSections as sections }

export const findPage = (slug: string): DocPage | undefined =>
  docPages.find((page) => page.slug === slug)

/** Case-insensitive, so `Tokens` and `tokens` do not sort into two groups. */
const byTitle = (a: DocPage, b: DocPage): number =>
  a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1

/**
 * The pages of one section, in the order a sidebar renders them.
 *
 * **Alphabetical, except a section that is a path, and except one pinned entry
 * page where a section has one.** The exemption is the same one `AGENTS.md`
 * grants positional arguments and middleware chains, that ordering is skipped
 * where order is semantic. Written down so a section is not silently reordered
 * by whoever next notices it is not alphabetical.
 */
const ordered = (pages: DocPage[], section: DocSection): DocPage[] => {
  if (section.path) {
    return [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  const pinned = pages.filter((page) => page.pinned)
  const rest = pages.filter((page) => !page.pinned).sort(byTitle)
  return [...pinned, ...rest]
}

/**
 * The whole sidebar: every declared section, its pages in render order, and
 * each page's children beneath it.
 *
 * A section with no pages cannot appear, because `turbo run docs -- --check` refuses
 * to generate one. Children are alphabetical, because nesting exists for the
 * per-framework installation pages and a reader picking their framework out of
 * a list is looking one up rather than reading a sequence, and then the
 * `trailing` ones, which are the pages that answer "none of the above" and
 * which the alphabet was interleaving with the answers they follow from.
 */
export const navigation = (): DocNavSection[] =>
  docSections.map((section) => {
    const own = docPages.filter(
      (page) => page.section === section.title && page.parent === undefined,
    )
    return {
      ...section,
      pages: ordered(own, section).map((page) => ({
        ...page,
        children: docPages
          .filter((child) => child.parent === page.slug)
          .sort(
            (a, b) => Number(a.trailing ?? false) - Number(b.trailing ?? false) || byTitle(a, b),
          ),
      })),
    }
  })

/** Path to a page's MDX, relative to the package root. */
export const contentPath = (page: DocPage): string => `content/${page.slug}.mdx`
