/**
 * Documentation registry for Helix.
 *
 * Docs are a package rather than a folder inside a site so that a version of
 * the docs is pinned to the version of the code it describes. A site renders
 * this registry; it does not own it. That seam is what lets one site serve
 * several doc versions, and what lets the docs be versioned at all.
 */

/** Where a version sits in its lifecycle. */
export type VersionStatus = 'archived' | 'current' | 'next'

export interface DocPage {
  /** One-line summary, used for nav tooltips and search results. */
  description: string
  /** Position within its section. */
  order: number
  /** Path segment, unique within a version. */
  slug: string
  /** Top-level grouping in the sidebar. */
  section: string
  title: string
}

export interface DocVersion {
  /** Directory under `content/` holding this version's MDX. */
  dir: string
  /** Human label, e.g. "0.0.x". */
  label: string
  pages: DocPage[]
  status: VersionStatus
  /** Semver range this documentation describes. */
  version: string
}

const v0: DocVersion = {
  dir: 'v0',
  label: '0.0.x',
  pages: [
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
  ],
  status: 'current',
  version: '0.0.1',
}

/** Every published version, newest first. */
export const versions: DocVersion[] = [v0]

/** The version served at the unversioned docs root. */
export const currentVersion: DocVersion = v0

export const findVersion = (version: string): DocVersion | undefined =>
  versions.find((v) => v.version === version || v.label === version)

export const findPage = (version: DocVersion, slug: string): DocPage | undefined =>
  version.pages.find((p) => p.slug === slug)

/** Pages grouped by section, each section's pages ordered. */
export const sections = (version: DocVersion): Array<{ pages: DocPage[]; section: string }> => {
  const grouped = new Map<string, DocPage[]>()
  for (const page of version.pages) {
    const existing = grouped.get(page.section)
    if (existing) {
      existing.push(page)
    } else {
      grouped.set(page.section, [page])
    }
  }
  return [...grouped.entries()].map(([section, pages]) => ({
    pages: [...pages].sort((a, b) => a.order - b.order),
    section,
  }))
}

/** Path to a page's MDX, relative to the package root. */
export const contentPath = (version: DocVersion, page: DocPage): string =>
  `content/${version.dir}/${page.slug}.mdx`
