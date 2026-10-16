import { describe, expect, test } from 'bun:test'
import { columnShares, markdownToHtml, safeUrl } from './tree.js'

describe('markdownToHtml', () => {
  test('draws paragraphs, headings and marks', () => {
    expect(markdownToHtml('# A *b*\n\nText `c`')).toBe(
      '<h1>A <em>b</em></h1><p>Text <code>c</code></p>',
    )
  })

  test('draws a fence as a code block with its language', () => {
    expect(markdownToHtml('```ts\nlet a = 1\n```')).toBe(
      '<helix-code-block label="ts" language="ts">let a = 1</helix-code-block>',
    )
  })

  test('draws an alert as a callout in its tone, with its heading', () => {
    expect(
      markdownToHtml('> [!TIP]\n> Use it.', { tags: { callout: 'helix-headless-callout' } }),
    ).toBe(
      '<helix-headless-callout tone="success"><span slot="heading">Tip</span><p>Use it.</p></helix-headless-callout>',
    )
  })

  test("draws a list item's first paragraph without a p, tight or loose", () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(markdownToHtml('- a\n\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(markdownToHtml('- [x] done')).toBe(
      '<ul><li data-task=""><input checked="" disabled="" type="checkbox"> done</li></ul>',
    )
  })

  test('draws a table with columns sized from its header and aligned by attribute', () => {
    expect(markdownToHtml('| Name | Description |\n| - | -: |\n| a | b |')).toBe(
      '<div data-table=""><table data-columns="2"><colgroup><col width="26.67%"><col width="73.33%"></colgroup>' +
        '<thead><tr><th>Name</th><th data-align="end">Description</th></tr></thead>' +
        '<tbody><tr><td>a</td><td data-align="end">b</td></tr></tbody></table></div>',
    )
  })

  test('escapes text and draws HTML as text', () => {
    expect(markdownToHtml('<script>alert(1)</script> & "q"')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; "q"</p>',
    )
  })

  test('draws an image as a link to it, and drops an address it may not follow', () => {
    expect(markdownToHtml('![chart](https://x.dev/c.png)')).toBe(
      '<p><a href="https://x.dev/c.png">chart</a></p>',
    )
    expect(markdownToHtml('[go](javascript:alert(1))')).toBe('<p>go</p>')
  })
})

describe('safeUrl', () => {
  test('keeps relative addresses and four schemes', () => {
    expect(safeUrl('/a')).toBe('/a')
    expect(safeUrl('#b')).toBe('#b')
    expect(safeUrl('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(safeUrl(' HTTPS://x.dev ')).toBe('HTTPS://x.dev')
    expect(safeUrl('data:text/html,x')).toBeUndefined()
    expect(safeUrl('JavaScript:x')).toBeUndefined()
  })
})

describe('columnShares', () => {
  test('shares the width by heading length, between 4 and 24 characters', () => {
    expect(columnShares(['a', 'abcd'])).toEqual([50, 50])
    expect(columnShares(['x'.repeat(40), 'abcd'])).toEqual([85.71, 14.29])
  })
})
