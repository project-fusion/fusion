import rehypeHelix from '@fusion.dev/helix/rehype'
import { evaluate } from '@mdx-js/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'
import * as runtime from 'react/jsx-runtime'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import { DOCUMENT_COMPONENTS, PROSE_COMPONENTS } from '../../components/prose/prose'

/** A node of the HTML tree, as far as `nameTables` reads one. */
interface HastNode {
  children?: HastNode[]
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

/** A node's text, the text of every node inside it run together. */
const textOf = (node: HastNode): string =>
  node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('')

/**
 * **Each Helix table named by the heading it sits under.** A Markdown table
 * has no caption, so the tables Helix's plugin makes have no name, and every
 * one of them reported itself as nameless. The heading is what a reader
 * scanning the page takes the table to be about. A table under no heading, or
 * one that already has a label, is left as it is.
 */
const nameTables = () => (tree: HastNode) => {
  let heading = ''
  const walk = (node: HastNode): void => {
    if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
      heading = textOf(node).trim()
      return
    }
    if (node.tagName === 'helix-table' && heading !== '' && !node.properties?.label) {
      node.properties = { ...node.properties, label: heading }
    }
    for (const child of node.children ?? []) {
      walk(child)
    }
  }
  walk(tree)
}

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
    rehypePlugins: [[rehypeHelix, { fences: false }], nameTables],
    remarkPlugins: [remarkFrontmatter, remarkGfm],
  })
  return Content({ components })
}

/** Prose, rendered the way every surface renders it. */
export const renderMdx = (source: string): Promise<ReactNode> => render(source, PROSE_COMPONENTS)

/** An argued document, which differs from prose only in how it numbers. */
export const renderDocument = (source: string): Promise<ReactNode> =>
  render(source, DOCUMENT_COMPONENTS)
