import { navigation } from '@fusion.dev/helix-docs'
import { getFamilies } from '../catalog/catalog'

/*
 * The Helix documentation sidebar: prose and reference in one tree.
 *
 * **There were two of these, and a reader in either one could not see the
 * other.** `/helix/docs/*` rendered five sections of MDX and `/helix/components/*`
 * rendered a flat list of families, from two components with the same name, the
 * same `helix-tree`, and the same link handling. So a reader partway through
 * Theming had no way to reach Card without going back up to the masthead, and a
 * reader on Card's page could not see that Forms and validation existed. The
 * navigation was answering "where am I" and never "what else is there", which is
 * the half a sidebar is actually for.
 *
 * `plan/23-helix-docs.md` has said Components is a section of this navigation
 * since the plan was written. It was the one section nobody built, and the
 * masthead had been compensating by hoisting Components to a product-level
 * destination beside Guides, which said the two were different kinds of thing.
 *
 * **The join is here rather than in `@fusion.dev/helix-docs`, and that is deliberate.**
 * A section of prose comes from the frontmatter of an MDX file in that package.
 * A component comes from `custom-elements.json`, which the docs package does not
 * read and must not: it documents Helix, it is not a consumer of Helix's build
 * output. The site is the one place that holds both, so the site is where they
 * meet.
 *
 * What that costs is the insertion point, which is a fact about the navigation
 * living outside the file called `sections.ts`. It is stated once, below, and
 * `check:gen:docs` still owns everything about the sections it does declare.
 */

/** A row in the sidebar: where it goes, what it is called, what sits under it. */
export interface NavEntry {
  children?: NavEntry[]
  /** The path this row navigates to, which is also its value in the tree. */
  href: string
  label: string
}

/** A branch of the sidebar, with its rows in render order. */
export interface NavSection {
  entries: NavEntry[]
  title: string
}

/**
 * Where the reference sits among the prose.
 *
 * After Essentials and before Tooling, which is the order the plan's table
 * gives: a reader learns the vocabulary, then the ideas that use it, then looks
 * a component up, and Tooling is what surrounds all of it. Named rather than
 * indexed so that adding a section to `sections.ts` cannot silently move this.
 */
const AFTER = 'Essentials'

/**
 * Every family, under a row that goes to the index.
 *
 * The index row comes first because it is the whole of what the rows under it
 * are part of, and it carries `/helix` rather than a family, so it is never
 * marked current while a component is open.
 */
const components = (): NavSection => ({
  entries: [
    { href: '/helix', label: 'All components' },
    ...getFamilies().map((family) => ({
      href: `/helix/components/${family.slug}`,
      label: family.label,
    })),
  ],
  title: 'Components',
})

/** The whole sidebar, in render order, for every page under `/helix`. */
export const helixNavigation = (): NavSection[] => {
  const prose: NavSection[] = navigation().map((section) => ({
    entries: section.pages.map((page) => ({
      children: page.children.map((child) => ({
        href: `/helix/docs/${child.slug}`,
        label: child.title,
      })),
      href: `/helix/docs/${page.slug}`,
      label: page.title,
    })),
    title: section.title,
  }))

  const at = prose.findIndex((section) => section.title === AFTER)
  /* Appended rather than dropped if `AFTER` ever stops existing: a section
     nobody can reach is worse than one in the wrong place. */
  const insert = at === -1 ? prose.length : at + 1
  return [...prose.slice(0, insert), components(), ...prose.slice(insert)]
}
