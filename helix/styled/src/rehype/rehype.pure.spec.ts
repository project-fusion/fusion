import { describe, expect, test } from 'bun:test'
import remarkGfm from 'remark-gfm'
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
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHelix, options)
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

  test('a table becomes a Helix table, its header row its columns, each aligned as written', async () => {
    const [table] = top(
      await treeOf(
        '| Token | Size |\n| :-- | --: |\n| `--helix-text-sm` | 14px |\n| `--helix-text-md` | 16px |',
      ),
    )
    expect(table?.tagName).toBe('helix-table')
    const children = table?.children ?? []
    expect(children.map((one) => one.tagName)).toEqual([
      'helix-table-column',
      'helix-table-column',
      'helix-table-row',
      'helix-table-row',
    ])
    expect(children.map((one) => one.properties)).toEqual([
      { 'text-align': 'start' },
      { 'text-align': 'end' },
      {},
      {},
    ])
    const [row] = children.slice(2)
    expect(row?.children?.map((one) => one.tagName)).toEqual([
      'helix-table-cell',
      'helix-table-cell',
    ])
    expect(row?.children?.[0]?.children?.[0]?.tagName).toBe('code')
    expect(textOf(row as Node)).toBe('--helix-text-sm14px')
  })

  /* One cell spanning two columns would put every cell after it a column
     late, and a heading in a body row would be announced as a heading of
     its column. HTML draws both, so they stay HTML. */
  test('a table the grid cannot draw as written stays a table', async () => {
    const cell = (tagName: string, properties = {}): Node => ({
      children: [{ type: 'text', value: 'x' }],
      properties,
      tagName,
      type: 'element',
    })
    const tableOf = (head: Node[], row: Node[]): Node => ({
      children: [
        {
          children: [
            {
              children: [
                {
                  children: [{ children: head, tagName: 'tr', type: 'element' }],
                  tagName: 'thead',
                  type: 'element',
                },
                {
                  children: [{ children: row, tagName: 'tr', type: 'element' }],
                  tagName: 'tbody',
                  type: 'element',
                },
              ],
              tagName: 'table',
              type: 'element',
            },
          ],
          tagName: 'div',
          type: 'element',
        },
      ],
      type: 'root',
    })
    const drawn = (tree: Node): string | undefined => {
      rehypeHelix()(tree as never)
      return tree.children?.[0]?.children?.[0]?.tagName
    }
    expect(drawn(tableOf([cell('th'), cell('th')], [cell('td'), cell('td')]))).toBe('helix-table')
    expect(drawn(tableOf([cell('th'), cell('th')], [cell('td', { colSpan: 2 })]))).toBe('table')
    expect(drawn(tableOf([cell('th'), cell('th')], [cell('th'), cell('td')]))).toBe('table')
  })

  test('tables can be left alone', async () => {
    const [table] = top(await treeOf('| A |\n| - |\n| x |', { tables: false }))
    expect(table?.tagName).toBe('table')
  })
})
