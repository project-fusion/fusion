import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessMarkdown } from './markdown-root.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/**
 * Streams `text` into the element a few characters at a time, as a reply
 * arrives, from the end of what it already holds.
 */
const stream = async (element: HelixHeadlessMarkdown, text: string, step = 3): Promise<void> => {
  element.streaming = true
  for (let at = element.text.length + step; at < text.length + step; at += step) {
    element.text = text.slice(0, at)
    await element.updateComplete
  }
}

/** Every node under the element, so a spec can tell which survived a write. */
const nodesOf = (root: Node): Node[] => {
  const all: Node[] = []
  const walker = root.ownerDocument?.createTreeWalker(root, 0xffffffff)
  let node = walker?.nextNode()
  while (node) {
    all.push(node)
    node = walker?.nextNode()
  }
  return all
}

const fresh = async (): Promise<HelixHeadlessMarkdown> =>
  (await mount('<helix-headless-markdown></helix-headless-markdown>')) as HelixHeadlessMarkdown

describe('markdown', () => {
  test('draws the document into its own children', async () => {
    const element = await fresh()
    element.text = '# Title\n\nSome *text*.'
    await element.updateComplete
    expect(element.innerHTML).toBe('<h1>Title</h1><p>Some <em>text</em>.</p>')
  })

  test('never redraws a block that has ended while the rest streams in', async () => {
    const element = await fresh()
    await stream(element, '# Title\n\nFirst paragraph.\n\n')
    const before = nodesOf(element)
    await stream(
      element,
      '# Title\n\nFirst paragraph.\n\nSecond paragraph, arriving word by word, with **bold** text.',
    )
    const after = nodesOf(element)
    for (const node of before) {
      expect(after).toContain(node)
    }
  })

  test('adds each word to the text node it ends', async () => {
    const element = await fresh()
    element.streaming = true
    element.text = 'One two'
    await element.updateComplete
    const line = element.querySelector('p')?.firstChild
    element.text = 'One two three'
    await element.updateComplete
    expect(element.querySelector('p')?.firstChild).toBe(line as ChildNode)
    expect(line?.textContent).toBe('One two three')
  })

  test('draws bold at once and keeps the element when the closing pair arrives', async () => {
    const element = await fresh()
    element.streaming = true
    element.text = 'Some **bo'
    await element.updateComplete
    const strong = element.querySelector('strong')
    expect(strong?.textContent).toBe('bo')
    element.text = 'Some **bold** text'
    await element.updateComplete
    expect(element.querySelector('strong')).toBe(strong)
    expect(element.innerHTML).toBe('<p>Some <strong>bold</strong> text</p>')
  })

  test('grows a code block in place, as one element with one text node', async () => {
    const element = await fresh()
    await stream(element, '```js\nlet a = 1\n')
    const block = element.querySelector('helix-headless-code-block')
    const text = block?.firstChild
    await stream(element, '```js\nlet a = 1\nlet b = 2\nlet c = 3\n```\n\nAfter.')
    expect(element.querySelector('helix-headless-code-block')).toBe(block)
    expect(block?.firstChild).toBe(text as ChildNode)
    expect(block?.textContent).toBe('let a = 1\nlet b = 2\nlet c = 3')
    expect(block?.getAttribute('language')).toBe('js')
  })

  test('keeps a table and its columns as its rows arrive', async () => {
    const element = await fresh()
    const table = '| Name | Description |\n| --- | --- |\n| one | the first |\n'
    await stream(element, table)
    const drawn = element.querySelector('table')
    const widths = [...(drawn?.querySelectorAll('col') ?? [])].map((col) =>
      col.getAttribute('width'),
    )
    await stream(
      element,
      `${table}| two | the second, which is a much longer description than the first |\n`,
    )
    expect(element.querySelector('table')).toBe(drawn)
    expect(
      [...(drawn?.querySelectorAll('col') ?? [])].map((col) => col.getAttribute('width')),
    ).toEqual(widths)
    expect(drawn?.querySelectorAll('tbody tr').length).toBe(2)
  })

  test('never shows a table header as a paragraph first', async () => {
    const element = await fresh()
    element.streaming = true
    for (const text of [
      'Intro.\n\n| a',
      'Intro.\n\n| a | b |',
      'Intro.\n\n| a | b |\n|',
      'Intro.\n\n| a | b |\n| - | - |\n',
    ]) {
      element.text = text
      await element.updateComplete
      expect(element.querySelectorAll('p').length).toBe(1)
    }
    expect(element.querySelector('th')?.textContent).toBe('a')
  })

  test('keeps a list item when a blank line makes the list loose', async () => {
    const element = await fresh()
    await stream(element, '- one\n')
    const item = element.querySelector('li')
    await stream(element, '- one\n\n- two\n')
    expect(element.querySelector('li')).toBe(item)
    expect(item?.innerHTML).toBe('one')
  })

  test('draws the held end once the reply ends', async () => {
    const element = await fresh()
    element.streaming = true
    element.text = 'Text\n#'
    await element.updateComplete
    expect(element.innerHTML).toBe('<p>Text</p>')
    element.streaming = false
    await element.updateComplete
    expect(element.innerHTML).toBe('<p>Text</p><h1></h1>')
  })

  test('reads an unclosed mark as its characters once the reply ends', async () => {
    const element = await fresh()
    element.streaming = true
    element.text = 'Not **closed'
    await element.updateComplete
    element.streaming = false
    await element.updateComplete
    expect(element.innerHTML).toBe('<p>Not **closed</p>')
  })

  test('starts over on a text that does not extend the last', async () => {
    const element = await fresh()
    element.text = '# One'
    await element.updateComplete
    element.text = 'Two'
    await element.updateComplete
    expect(element.innerHTML).toBe('<p>Two</p>')
  })

  test('appends a chunk to its text', async () => {
    const element = await fresh()
    element.appendText('a ')
    element.appendText('b')
    await element.updateComplete
    expect(element.text).toBe('a b')
    expect(element.innerHTML).toBe('<p>a b</p>')
  })

  test('takes over what a server drew for the same text, and redraws anything else', async () => {
    const served = (await mount(
      '<helix-headless-markdown text="# Served"><h1>Served</h1></helix-headless-markdown>',
    )) as HelixHeadlessMarkdown
    expect(served.innerHTML).toBe('<h1>Served</h1>')
    const stale = (await mount(
      '<helix-headless-markdown text="# New"><h1>Old</h1></helix-headless-markdown>',
    )) as HelixHeadlessMarkdown
    expect(stale.innerHTML).toBe('<h1>New</h1>')
  })

  test('is busy while streaming, and says so through a state', async () => {
    const element = await fresh()
    element.streaming = true
    await element.updateComplete
    const internals = (element as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaBusy).toBe('true')
    expect(hasState(element, 'streaming')).toBe(true)
    element.streaming = false
    await element.updateComplete
    expect(internals.ariaBusy).toBeNull()
  })

  test('names an alert in the words it is given', async () => {
    const element = await fresh()
    element.noteHeading = 'Hinweis'
    element.text = '> [!NOTE]\n> Text'
    await element.updateComplete
    expect(element.querySelector('[slot="heading"]')?.textContent).toBe('Hinweis')
  })
})

describe('markdown streamed one character at a time', () => {
  const REPLY = [
    '## Plan',
    '',
    'We change **three things**, in order. See [the guide](https://fusion.dev/helix) first.',
    '',
    '1. Read the `config` file.',
    '2. Update the *schema*:',
    '   - add a column',
    '   - [x] keep the old one',
    '',
    '> [!WARNING]',
    '> Back up the database before you start.',
    '',
    '```ts',
    'const table = await db.table("users")',
    'await table.addColumn("plan", "text")',
    '```',
    '',
    '| Step | What happens |',
    '| :-- | --: |',
    '| 1 | The file is read |',
    '| 2 | The schema is changed, and every row gains the new column |',
    '',
    '---',
    '',
    'That is all ~~for now~~.',
  ].join('\n')

  test('replaces no top-level block, and ends as the finished document draws', async () => {
    const element = await fresh()
    element.streaming = true
    let previous: Element[] = []
    let replaced = 0
    for (let at = 1; at <= REPLY.length; at += 1) {
      element.text = REPLY.slice(0, at)
      await element.updateComplete
      const now = [...element.children]
      /* Not even the open block: what was drawn stays drawn. */
      previous.forEach((block, index) => {
        if (now[index] !== block) {
          replaced += 1
        }
      })
      previous = now
    }
    element.streaming = false
    await element.updateComplete
    expect(replaced).toBe(0)
    const { markdownToHtml } = await import('../tree.js')
    expect(element.innerHTML).toBe(
      markdownToHtml(REPLY, {
        tags: { callout: 'helix-headless-callout', codeBlock: 'helix-headless-code-block' },
      }),
    )
  })
})
