import { describe, expect, test } from 'bun:test'
import { highlightedLines } from './highlight.js'

describe('highlightedLines', () => {
  /* What Shiki's `codeToHtml` returns: a block of its own, with a tab stop. */
  test("takes the lines out of Shiki's whole block", () => {
    const shiki =
      '<pre class="shiki github-light" style="background-color:#fff;color:#24292e" tabindex="0"><code><span class="line"><span style="color:#D73A49">const</span> a</span>\n<span class="line">b</span></code></pre>'
    expect(highlightedLines(shiki)).toBe(
      '<span class="line"><span style="color:#D73A49">const</span> a</span>\n<span class="line">b</span>',
    )
  })

  test('takes a wrapper written with a class on the code, and a line break after it', () => {
    expect(highlightedLines('<pre><code class="language-ts">a</code></pre>\n')).toBe('a')
  })

  /* What Prism's `highlight` and highlight.js return. */
  test('passes the lines alone through unchanged', () => {
    const prism =
      '<span class="token keyword">const</span> a <span class="token operator">=</span> 1'
    expect(highlightedLines(prism)).toBe(prism)
  })

  test('leaves a `<pre>` that is not the whole markup alone', () => {
    const two = '<pre><code>a</code></pre><pre><code>b</code></pre>'
    expect(highlightedLines('<span>x</span><pre><code>a</code></pre>')).toBe(
      '<span>x</span><pre><code>a</code></pre>',
    )
    expect(highlightedLines(two)).toBe(two)
  })
})
