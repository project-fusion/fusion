import { evaluate } from '@mdx-js/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'
import * as runtime from 'react/jsx-runtime'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import { DOCUMENT_COMPONENTS, PROSE_COMPONENTS } from '../../components/prose/prose'

/**
 * MDX, compiled to React at build time.
 *
 * **Every page that uses this is static**, so this runs once during
 * `next build` and never in a request. That is what makes compiling here rather
 * than through a bundler plugin the cheap option: there is no runtime.
 *
 * **The source arrives as a string, never as a path.** Reading one is the
 * filesystem access that traces this app's whole repository into the server
 * bundle, so `@fusion.dev/insights` generates its files into a module and this
 * compiles what it is handed.
 *
 * **Not `@next/mdx`.** Its file convention wants `.mdx` inside `app/`, and all
 * three content packages are deliberately outside it, so that documentation is
 * pinned to the version of the code it describes and the site's prose is a
 * package rather than a folder in a route.
 *
 * `remark-frontmatter` is what stops the `---` block rendering as a row of
 * dashes, which is what it does without it. The plugin removes the block rather
 * than reading it; the registry beside the content carries the same fields in a
 * typed form.
 *
 * `remark-gfm` is here for tables. The thesis stack is one.
 *
 * **The component map is passed here rather than per call site**, so that every
 * MDX surface renders the same way. Without one a fenced block comes out as an
 * unhighlighted `<pre>` on every surface; that module says which elements map
 * and, at more length, which deliberately do not.
 *
 * **Two entry points and one map, which is not a walk back from that.** What the
 * central pass protects is that no surface renders with fewer components than
 * the base map, and a call site that could hand its own would put that back at
 * risk one page at a time. So the choice is not a parameter: `renderDocument`
 * names the surface it is for, and `DOCUMENT_COMPONENTS` is a spread over
 * `PROSE_COMPONENTS` rather than a map of its own, so neither entry point can be
 * reached with less than the base.
 *
 * The one element that differs is `ol`. An argued document sets its numbers in a
 * rail, a claim per item with prose under it and the numbering carried down the
 * left; a numbered list in the component documentation is a list of steps and
 * wants the platform's marker beside the words. Both are correct and they are
 * not the same list, which is the whole reason there are two.
 */
const render = async (source: string, components: MDXComponents): Promise<ReactNode> => {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkFrontmatter, remarkGfm],
  })
  return Content({ components })
}

/** Prose, rendered the way every surface renders it. */
export const renderMdx = (source: string): Promise<ReactNode> => render(source, PROSE_COMPONENTS)

/** An argued document, which differs from prose only in how it numbers. */
export const renderDocument = (source: string): Promise<ReactNode> =>
  render(source, DOCUMENT_COMPONENTS)
