/**
 * The starter templates, as data.
 *
 * **Templates are a package rather than a directory inside a scaffolder**, which
 * is the whole reason this exists. `helix new` and `npm create helix-app` are one
 * capability behind two doors, and the thing that would drift between them is the
 * templates rather than the twenty lines of copy-and-substitute around them. Both
 * doors read this.
 *
 * **Versioned with Helix**, so a template scaffolds against the components it was
 * written for. A template pinned to nothing is a template that stops compiling on
 * somebody else's release.
 *
 * The payloads sit in `templates/<id>/` and travel in the published package. This
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
  /** The directory under `templates/`, and the id a caller passes. */
  readonly id: string
  /** What it is called in a chooser. */
  readonly title: string
}

/**
 * **In the order a chooser should offer them**, which is not alphabetical.
 *
 * `react-vite` is first because it is the shortest path from nothing to a
 * component on screen, and a first release is judged on that. `html` is last
 * because it is the one a reader picks deliberately rather than by default,
 * being the answer for somebody who wants no build at all.
 */
export const templates: readonly Template[] = [
  {
    description: 'React and TypeScript on Vite. The shortest path to a running component.',
    id: 'react-vite',
    named: ['index.html', 'package.json', 'src/App.tsx'],
    title: 'React (Vite)',
  },
  {
    description:
      'React and TypeScript on the Next.js App Router, with the elements registered once.',
    id: 'react-nextjs',
    named: ['app/layout.tsx', 'app/page.tsx', 'package.json'],
    title: 'React (Next.js)',
  },
  {
    description: 'One HTML file and a stylesheet. No build step and no framework.',
    id: 'html',
    named: ['index.html', 'package.json'],
    title: 'Plain HTML',
  },
]

/** The placeholder a scaffolder replaces with the project's name. */
export const PROJECT_NAME = '__PROJECT_NAME__'

/** The one template with this id, or `undefined` where there is none. */
export const findTemplate = (id: string): Template | undefined =>
  templates.find((one) => one.id === id)
