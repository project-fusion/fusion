import rehypeHelix from '@fusion.dev/helix/rehype'
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
 * **GitHub alerts become callouts and tables become Helix tables** through
 * Helix's own rehype plugin, the one the recipes page gives consumers. Its
 * fences are left to `CodeFence`, which highlights them with the sandbox's
 * grammars.
 */
const render = async (source: string, components: MDXComponents): Promise<ReactNode> => {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    rehypePlugins: [[rehypeHelix, { fences: false }]],
    remarkPlugins: [remarkFrontmatter, remarkGfm],
  })
  return Content({ components })
}

/** Prose, rendered the way every surface renders it. */
export const renderMdx = (source: string): Promise<ReactNode> => render(source, PROSE_COMPONENTS)

/** An argued document, which differs from prose only in how it numbers. */
export const renderDocument = (source: string): Promise<ReactNode> =>
  render(source, DOCUMENT_COMPONENTS)
