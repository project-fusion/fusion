/**
 * Documentation registry for Helix.
 *
 * Docs are a package rather than a folder inside a site so that the docs are
 * pinned to the version of the code they describe. A site renders this
 * registry; it does not own it.
 *
 * **There is no version axis in here.** The package version is the version:
 * `@helix-io/docs@0.2.0` documents Helix 0.2.0, because every package in a
 * domain moves in lockstep. A `versions` array beside that would be a second
 * source of truth with nothing keeping the two in step, and the first time they
 * disagreed the registry would win over the package that shipped it.
 *
 * A site serving several versions installs several versions, which is the
 * mechanism npm already provides and the only one that cannot drift.
 */

export interface DocPage {
  /** One-line summary, used for nav tooltips and search results. */
  description: string
  /** Position within its section. */
  order: number
  /** Path segment, unique across the package. */
  slug: string
  /** Top-level grouping in the sidebar. */
  section: string
  title: string
}

/** Every page this package documents. */
export const pages: DocPage[] = [
  {
    description: 'What Helix is, and the five tiers it ships as.',
    order: 1,
    section: 'Overview',
    slug: 'introduction',
    title: 'Introduction',
  },
  {
    description: 'Why the headless and styled tiers are separate packages.',
    order: 2,
    section: 'Overview',
    slug: 'tiers',
    title: 'Tiers',
  },
  {
    description: 'Deriving an accessible token set from intent inputs.',
    order: 1,
    section: 'Theming',
    slug: 'theming',
    title: 'Theming',
  },
]

export const findPage = (slug: string): DocPage | undefined =>
  pages.find((page) => page.slug === slug)

/** Pages grouped by section, each section's pages ordered. */
export const sections = (): Array<{ pages: DocPage[]; section: string }> => {
  const grouped = new Map<string, DocPage[]>()
  for (const page of pages) {
    const existing = grouped.get(page.section)
    if (existing) {
      existing.push(page)
    } else {
      grouped.set(page.section, [page])
    }
  }
  return [...grouped.entries()].map(([section, entries]) => ({
    pages: [...entries].sort((a, b) => a.order - b.order),
    section,
  }))
}

/** Path to a page's MDX, relative to the package root. */
export const contentPath = (page: DocPage): string => `content/${page.slug}.mdx`
