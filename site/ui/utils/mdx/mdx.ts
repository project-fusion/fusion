import { evaluate } from '@mdx-js/mdx'
import type { ReactNode } from 'react'
import * as runtime from 'react/jsx-runtime'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import { PROSE_COMPONENTS } from '../../components/prose/prose'

/**
 * MDX, compiled to React at build time.
 *
 * **Every page that uses this is static**, so this runs once during
 * `next build` and never in a request. That is what makes compiling here rather
 * than through a bundler plugin the cheap option: there is no runtime.
 *
 * **The source arrives as a string, never as a path.** Reading it would be the
 * filesystem access that traced this app's whole repository into the server
 * bundle and was removed two days ago, so `@fusion-io/site-content` generates
 * its files into a module and this compiles what it is handed.
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
 * `remark-gfm` is here for tables. The thesis stack is one, and a table is the
 * shape that data always had: it was a grid of components before, which is the
 * same table with more machinery around it.
 *
 * **`PROSE_COMPONENTS` is passed here rather than per call site**, so that
 * every MDX surface renders the same way. It shipped without one, which meant a
 * fenced block came out as an unhighlighted `<pre>` on all five of them; that
 * module says which elements map and, at more length, which deliberately do
 * not.
 */
export const renderMdx = async (source: string): Promise<ReactNode> => {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkFrontmatter, remarkGfm],
  })
  return Content({ components: PROSE_COMPONENTS })
}
