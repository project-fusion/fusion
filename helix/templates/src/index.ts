/**
 * The starter templates, as data.
 *
 * **Templates are a package rather than a directory inside a scaffolder**, which
 * is the whole reason this exists. `helix new` and
 * `npm create @fusion.dev/helix-app` are one capability behind two doors, and the
 * thing that would drift between them is the templates rather than the twenty
 * lines of copy-and-substitute around them. Both doors read this.
 *
 * **Versioned with Helix**, so a template scaffolds against the components it was
 * written for. A template pinned to nothing is a template that stops compiling on
 * somebody else's release.
 *
 * The payloads sit in `template-<id>/` and travel in the published package. This
 * module is the register: what exists, what each one is for, and which file a
 * consumer's project name has to be written into.
 */

/** One template, and everything a scaffolder needs to lay it down. */
export interface Template {
  /** What a reader chooses it for, in one line. */
  readonly description: string
  /**
   * Files whose contents carry `__PROJECT_NAME__`.
   *
   * Named rather than discovered by scanning every file, so a template that
   * mentions the placeholder in prose does not get it silently rewritten, and so
   * a rename that misses a file fails a test rather than shipping.
   */
  readonly named: readonly string[]
  /** Names the `template-<id>/` directory, and is the id a caller passes. */
  readonly id: string
  /** What it is called in a chooser. */
  readonly title: string
}

/**
 * **In the order a chooser should offer them**, which is not alphabetical.
 *
 * `react-vite` is first because it is the shortest path from nothing to a
 * component on screen, and a first release is judged on that.
 *
 * **There is no build-free HTML template, and that is a fact about the packages
 * rather than an omission.** `@fusion.dev/helix`'s published entry re-exports
 * bare specifiers (`@fusion.dev/helix-core`, ninety-odd
 * `@fusion.dev/helix-headless/*` subpaths, `lit` and its own graph), which a
 * browser cannot resolve without an import map covering all of it. An import map
 * that large is a build artifact wearing a template's clothes. The honest
 * build-free story is a CDN that rewrites the graph, which wants the packages
 * public first.
 */
export const templates: readonly Template[] = [
  {
    description: 'React and TypeScript on Vite. The shortest path to a running app.',
    id: 'react-vite',
    named: ['index.html', 'package.json', 'src/site-header.tsx'],
    title: 'React (Vite)',
  },
  {
    description:
      'React and TypeScript on the Next.js App Router, with the three pages as real routes.',
    id: 'react-nextjs',
    named: ['app/layout.tsx', 'app/site-header.tsx', 'package.json'],
    title: 'React (Next.js)',
  },
]

/** The placeholder a scaffolder replaces with the project's name. */
export const PROJECT_NAME = '__PROJECT_NAME__'

/**
 * The placeholder a scaffolder replaces with this package's own version.
 *
 * **Which is the Helix a template was published with**, every Helix package
 * sharing one version, so a template asks for the components it shipped beside
 * and no release has to remember to update it. Written by hand, both templates
 * asked for `^0.0.9`, which under a zero major admits `0.0.9` alone, and a new
 * project installed that release while 0.25.0 was current.
 */
export const HELIX_VERSION = '__HELIX_VERSION__'

/** The one template with this id, or `undefined` where there is none. */
export const findTemplate = (id: string): Template | undefined =>
  templates.find((one) => one.id === id)
