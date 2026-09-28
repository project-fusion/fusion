import { describe, expect, test } from 'bun:test'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import rehypeHelix, { type RehypeHelixOptions } from './rehype.js'

/** A node of the tree, as the spec reads one. */
interface Node {
  children?: Node[]
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

/** Markdown through the pipeline a consumer runs, and the tree it ends in. */
const treeOf = async (markdown: string, options?: RehypeHelixOptions): Promise<Node> => {
  const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeHelix, options)
  return (await processor.run(processor.parse(markdown))) as Node
}

/** The top-level elements, the whitespace between them left out. */
const top = (tree: Node): Node[] => (tree.children ?? []).filter((one) => one.type === 'element')

/** A node's text, all of it. */
const textOf = (node: Node): string =>
  node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('')

describe('rehypeHelix', () => {
  test('a fence becomes a code block labeled with its language, its last newline dropped', async () => {
    const [block] = top(await treeOf('```ts\nconst a = 1\n```'))
    expect(block?.tagName).toBe('helix-code-block')
    expect(block?.properties).toEqual({ label: 'ts' })
    expect(textOf(block as Node)).toBe('const a = 1')
  })

  test('a fence with no language has no label, and inline code is left as code', async () => {
    const [block, paragraph] = top(await treeOf('```\nplain\n```\n\nSome `inline` code.'))
    expect(block?.tagName).toBe('helix-code-block')
    expect(block?.properties).toEqual({})
    expect(paragraph?.tagName).toBe('p')
    expect(paragraph?.children?.some((one) => one.tagName === 'code')).toBe(true)
  })

  test('each alert becomes a callout in its tone, headed by its kind, and an important one has no tone', async () => {
    const kinds = [
      ['NOTE', 'info', 'Note'],
      ['TIP', 'success', 'Tip'],
      ['IMPORTANT', undefined, 'Important'],
      ['WARNING', 'warning', 'Warning'],
      ['CAUTION', 'danger', 'Caution'],
    ] as const
    for (const [marker, tone, heading] of kinds) {
      const [callout] = top(await treeOf(`> [!${marker}]\n> Read this first.`))
      expect([marker, callout?.tagName]).toEqual([marker, 'helix-callout'])
      expect([marker, callout?.properties?.tone]).toEqual([marker, tone])
      const [head, paragraph] = (callout?.children ?? []).filter((one) => one.type === 'element')
      expect([marker, head?.properties?.slot, textOf(head as Node)]).toEqual([
        marker,
        'heading',
        heading,
      ])
      expect([marker, textOf(paragraph as Node).trim()]).toEqual([marker, 'Read this first.'])
    }
  })

  test('the marker is taken out, and every paragraph after it kept', async () => {
    const [callout] = top(await treeOf('> [!note]\n> One.\n>\n> Two.'))
    const body = (callout?.children ?? []).filter((one) => one.tagName === 'p')
    expect(body.map((one) => textOf(one).trim())).toEqual(['One.', 'Two.'])
    expect(textOf(callout as Node)).not.toContain('[!')
  })

  test('a quote that is not an alert stays a quote, and so does a marker that does not lead', async () => {
    const tree = await treeOf('> Said once.\n\n> Not [!NOTE] at the start.')
    expect(top(tree).map((one) => one.tagName)).toEqual(['blockquote', 'blockquote'])
  })

  test('a fence inside an alert is a code block inside a callout', async () => {
    const [callout] = top(await treeOf('> [!TIP]\n> Run:\n>\n> ```sh\n> bun add x\n> ```'))
    const block = (callout?.children ?? []).find((one) => one.tagName === 'helix-code-block')
    expect(block?.properties).toEqual({ label: 'sh' })
  })

  test('fences or alerts can be left alone, and the headings written in another language', async () => {
    const markdown = '```ts\nx\n```\n\n> [!WARNING]\n> Careful.'
    const kept = top(await treeOf(markdown, { fences: false }))
    expect(kept.map((one) => one.tagName)).toEqual(['pre', 'helix-callout'])
    const quoted = top(await treeOf(markdown, { alerts: false }))
    expect(quoted.map((one) => one.tagName)).toEqual(['helix-code-block', 'blockquote'])
    const [, callout] = top(await treeOf(markdown, { headings: { warning: 'Achtung' } }))
    expect(textOf(callout?.children?.[0] as Node)).toBe('Achtung')
  })
})
