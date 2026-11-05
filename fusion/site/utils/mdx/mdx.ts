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

/** The element children of a node with the tag given. */
const childrenNamed = (node: HastNode, tagName: string): HastNode[] =>
  (node.children ?? []).filter((child) => child.tagName === tagName)

/**
 * **A table whose last column says the most can put it under each row on a
 * phone.** Measured at 390px, 36 of the 94 tables in the Helix docs ran past
 * the 358px column, Grounds by 79px, and a reader saw only the start of the
 * sentence that explains each row. Where the last column holds the longest text
 * of any, a sentence beside a name, it can take a line of its own under its
 * row, which is what the API tables on the component pages already do. The
 * other columns keep a track each in `--table-stacked`, which `site.css` reads
 * under its breakpoint. A table of figures has no such column and keeps
 * scrolling, its columns being the comparison.
 */
const stackTable = (table: HastNode): void => {
  const columns = childrenNamed(table, 'helix-table-column').length
  const rows = childrenNamed(table, 'helix-table-row')
  if (columns < 3 || rows.length === 0) {
    return
  }
  const lengths = Array.from({ length: columns }, (_, index) => {
    const cells = rows.map((row) => childrenNamed(row, 'helix-table-cell')[index])
    return cells.reduce((sum, cell) => sum + (cell ? textOf(cell).trim().length : 0), 0)
  })
  const last = lengths[columns - 1] ?? 0
  if (lengths.slice(0, -1).some((length) => length >= last)) {
    return
  }
  const style = typeof table.properties?.style === 'string' ? `${table.properties.style};` : ''
  table.properties = {
    ...table.properties,
    'data-stacked': '',
    style: `${style}--table-stacked: repeat(${columns - 1}, auto)`,
  }
}

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
    if (node.tagName === 'helix-table') {
      stackTable(node)
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
