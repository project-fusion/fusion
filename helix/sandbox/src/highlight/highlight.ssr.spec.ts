import { describe, expect, test } from 'bun:test'
import { highlight } from './highlight.js'

/**
 * The snippet highlighter emits a `tok-` span for each token it classifies.
 *
 * It runs at build time with no DOM, so this is a server spec. The site paints
 * the classes from `--helix-color-syntax-*`. When two copies of
 * `@lezer/highlight` are installed, `classHighlighter` and the parsers hold
 * different `tags` objects and every snippet comes back as plain text, which
 * is what the site shipped from October 6, 2026. Each case below fails on that
 * install.
 */
describe('snippet highlighting', () => {
  test('classifies the keyword and string in JavaScript', () => {
    const out = highlight('const greeting = "hi"', 'js')
    expect(out).toContain('<span class="tok-keyword">const</span>')
    expect(out).toContain('<span class="tok-string">&quot;hi&quot;</span>')
  })

  test('classifies the keyword and string in TSX', () => {
    const out = highlight('import type { Props } from "./props"', 'tsx')
    expect(out).toContain('<span class="tok-keyword">import</span>')
    expect(out).toContain('<span class="tok-string">&quot;./props&quot;</span>')
  })

  test('classifies the tag name, attribute and value in HTML', () => {
    const out = highlight('<helix-button variant="primary">Save</helix-button>', 'html')
    expect(out).toContain('<span class="tok-typeName">helix-button</span>')
    expect(out).toContain('<span class="tok-propertyName">variant</span>')
    expect(out).toContain('<span class="tok-string">&quot;primary&quot;</span>')
  })

  test('classifies the keyword, string and tag name in CSS', () => {
    const out = highlight('@media screen { a { content: "x"; } }', 'css')
    expect(out).toContain('<span class="tok-keyword">@media</span>')
    expect(out).toContain('<span class="tok-string">&quot;x&quot;</span>')
    expect(out).toContain('<span class="tok-typeName">a</span>')
  })

  test('classifies the command and the quoted string in shell', () => {
    const out = highlight('bun add "@fusion.dev/helix"', 'sh')
    expect(out).toContain('<span class="tok-keyword">bun</span>')
    expect(out).toContain('<span class="tok-string">&quot;@fusion.dev/helix&quot;</span>')
  })
})
