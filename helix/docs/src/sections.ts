/**
 * The navigation's spine: which sections exist, in what order, and how each
 * one orders the pages inside it.
 *
 * **Hand-authored, where the pages are not.** A page's own facts come from its
 * frontmatter and are generated into `pages.generated.ts`, because the
 * frontmatter is what a `.md` consumer actually receives and a second copy in
 * a registry is a second source of truth. A section is not a page and has no
 * frontmatter to derive from, so it is written here.
 *
 * **A section with no pages is not declared.** A navigation entry is the
 * strongest existence claim a site can make, so a section is added with the
 * pages that fill it rather than ahead of them. `bun run check:gen:docs` fails
 * on an empty section rather than rendering a heading with nothing under it.
 */

/** A top-level grouping in the sidebar. */
export interface DocSection {
  /**
   * Whether this section is a sequence rather than a lookup table.
   *
   * A path is read in order and its pages carry an explicit `order`. Every
   * other section sorts its pinned entry first and the rest alphabetically,
   * which is the right shape when a reader arrives knowing what they are
   * looking for. Getting started is the only path today.
   */
  path?: boolean
  /** Display name, and the value a page's `section` frontmatter matches. */
  title: string
}

/**
 * Every section, in the order the sidebar renders them.
 *
 * Deliberately an array rather than an alphabetized record: this is the one
 * place where order is the content. Foundations sits above Theming because a
 * reader needs the vocabulary before the thing that changes it, and no
 * alphabetization expresses that.
 */
export const docSections: DocSection[] = [
  { path: true, title: 'Getting started' },
  { title: 'Foundations' },
  { title: 'Theming' },
  { title: 'Essentials' },
  { title: 'Tooling' },
]

/** The section of a given name, if it is declared. */
export const findSection = (title: string): DocSection | undefined =>
  docSections.find((section) => section.title === title)
